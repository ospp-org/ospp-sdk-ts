/**
 * ECDSA P-256 signing and verification for OSPP.
 *
 * Source: spec/06-security.md §4.1 (algorithm inventory), §4.3 + §6.2
 * (RFC 6979 deterministic nonces are normative MUST for all software-based
 * ECDSA signing — hardware secure elements with internal RNG are exempt).
 *
 * Used for:
 *   - OfflinePass signing (server)
 *   - Receipt signing (station)
 *   - Firmware code-signing verification
 *   - Certificate management
 *
 * Signing uses `@noble/curves` p256, which implements RFC 6979 deterministic
 * nonces by default. node:crypto's `createSign` does NOT enforce RFC 6979 —
 * the prior implementation here relied on a false docstring claim and produced
 * random nonces, breaking byte-reproducibility of test vectors and signed
 * examples. Verification continues to use node:crypto since verify is
 * nonce-agnostic and accepts any DER ECDSA-P256-SHA256 signature.
 */

import { createPrivateKey, createVerify } from 'node:crypto';
import type { KeyLike, KeyObject } from 'node:crypto';
import { p256 } from '@noble/curves/nist.js';

const SIGNATURE_ALGORITHM = 'ECDSA-P256-SHA256' as const;

export { SIGNATURE_ALGORITHM };

/**
 * Decode a base64url-encoded string to bytes. JWKs encode the EC private
 * scalar `d` with base64url (RFC 4648 §5: `+→-`, `/→_`, padding optional).
 */
function base64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padCount = (4 - (padded.length % 4)) % 4;
  return new Uint8Array(Buffer.from(padded + '='.repeat(padCount), 'base64'));
}

/**
 * Extract the 32-byte private scalar `d` from a PEM / DER / KeyObject EC P-256
 * key. Uses Node's KeyObject → JWK export for a stable, encoding-agnostic path.
 * Throws when the input is not an EC P-256 private key (prevents accidental
 * RSA / Ed25519 / wrong-curve use).
 */
function extractP256Scalar(privateKey: KeyLike): Uint8Array {
  const keyObject: KeyObject =
    typeof privateKey === 'object' && privateKey !== null && 'export' in privateKey
      ? (privateKey as KeyObject)
      : createPrivateKey(privateKey as string | Buffer);

  const jwk = keyObject.export({ format: 'jwk' }) as {
    kty?: string;
    crv?: string;
    d?: string;
  };

  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || typeof jwk.d !== 'string') {
    throw new Error(
      `EcdsaSigner.sign: expected an EC P-256 private key (kty=${jwk.kty}, crv=${jwk.crv})`,
    );
  }

  const scalar = base64urlToBytes(jwk.d);

  if (scalar.length !== 32) {
    throw new Error(
      `EcdsaSigner.sign: P-256 private scalar must be 32 bytes (got ${scalar.length})`,
    );
  }

  return scalar;
}

/**
 * Sign data with ECDSA P-256 + SHA-256 + RFC 6979 deterministic nonce
 * (per spec §4.3 / §6.2).
 *
 * @param privateKey  PEM / DER / KeyObject EC P-256 (prime256v1) private key.
 * @param data        Data to sign (string is encoded as UTF-8, Buffer used as-is).
 * @returns           Base64-encoded DER ECDSA P-256 signature.
 */
export function sign(privateKey: KeyLike, data: string | Buffer): string {
  const scalar = extractP256Scalar(privateKey);
  const bytes = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  // `prehash: true` (the noble v2 p256 default) tells the signer to apply
  // SHA-256 to the message internally — matches node:crypto's createVerify
  // semantics on the verify side. Made explicit so that future @noble/curves
  // major-version default changes cannot silently break compatibility.
  const sigDer = p256.sign(bytes, scalar, { format: 'der', prehash: true });
  return Buffer.from(sigDer).toString('base64');
}

/**
 * Verify an ECDSA P-256 + SHA-256 signature.
 *
 * Verification is nonce-agnostic — any valid DER ECDSA P-256 signature
 * verifies regardless of how its nonce was generated. Continues to use
 * node:crypto so consumers see no behavior change on the verify path.
 *
 * @param publicKey   PEM / DER / KeyObject EC P-256 public key.
 * @param data        The original data that was signed.
 * @param signature   Base64-encoded DER signature to verify.
 * @returns           `true` iff the signature is valid for (publicKey, data).
 */
export function verify(publicKey: KeyLike, data: string | Buffer, signature: string): boolean {
  const verifier = createVerify('SHA256');
  verifier.update(data);
  verifier.end();
  return verifier.verify({ key: publicKey as string, dsaEncoding: 'der' }, signature, 'base64');
}
