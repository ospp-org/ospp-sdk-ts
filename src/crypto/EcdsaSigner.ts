/**
 * ECDSA P-256 signing and verification for OSPP.
 *
 * Source: spec/06-security.md §4.1.
 *
 * Used for:
 *   - OfflinePass signing (server)
 *   - Receipt signing (station)
 *   - Firmware code-signing verification
 *   - Certificate management
 *
 * All software-based signing MUST use RFC 6979 deterministic nonce.
 * Node.js crypto uses RFC 6979 by default for ECDSA.
 */

import { createSign, createVerify } from 'crypto';
import type { KeyLike } from 'crypto';

const ALGORITHM = 'SHA256';
const SIGNATURE_ALGORITHM = 'ECDSA-P256-SHA256' as const;

export { SIGNATURE_ALGORITHM };

/**
 * Sign data with ECDSA P-256 (SHA-256 digest, RFC 6979 deterministic nonce).
 *
 * @param privateKey  PEM-encoded EC private key (P-256 / prime256v1).
 * @param data        Data to sign (string or Buffer).
 * @returns           Base64-encoded DER signature.
 */
export function sign(privateKey: KeyLike, data: string | Buffer): string {
  const signer = createSign(ALGORITHM);
  signer.update(data);
  signer.end();
  return signer.sign({ key: privateKey as string, dsaEncoding: 'der' }, 'base64');
}

/**
 * Verify an ECDSA P-256 signature.
 *
 * @param publicKey   PEM-encoded EC public key (P-256 / prime256v1).
 * @param data        The original data that was signed.
 * @param signature   Base64-encoded DER signature to verify.
 * @returns           `true` if the signature is valid.
 */
export function verify(publicKey: KeyLike, data: string | Buffer, signature: string): boolean {
  const verifier = createVerify(ALGORITHM);
  verifier.update(data);
  verifier.end();
  return verifier.verify({ key: publicKey as string, dsaEncoding: 'der' }, signature, 'base64');
}
