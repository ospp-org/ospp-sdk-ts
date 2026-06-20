/**
 * BLE SessionCrypto — the per-handshake cryptographic pipeline of
 * 06-security.md §6.5 (ECDH P-256 key agreement, HKDF key schedule, AEAD
 * channel) and the StationIdentity certificate verification of §6.5.2.
 *
 * Reference implementation (mirrored, do not reinvent): the validated oracle at
 * spec tools/ble-crypto.mjs. Every function here reproduces a field of the spec
 * conformance corpus (conformance/test-vectors/crypto/ble-handshake-keyschedule.json),
 * which is anchored on published RFC vectors (RFC 5903 / 5869 / 8439) — see
 * tests/crypto/ble/rfc-anchors.test.ts.
 *
 * Browser/RN-safe by construction (the BLE "app" side is a mobile client): only
 * @noble/curves, Uint8Array I/O — NO node:crypto, NO Buffer. On-wire encodings
 * (compressed-SEC1 Base64, hex) are decoded to bytes at the message layer; the
 * crypto core operates on raw bytes.
 *
 * P1 implements 2 of the 10 functions: validatePublicKey (Pin 2 / §6.5.2) and
 * ecdhSharedX (Pin 1 / §6.5). Transcript, key schedule, sessionProof, AEAD
 * framing, and cert verification are P2-P5.
 */

import { p256 } from '@noble/curves/nist.js';

/**
 * Pin 2 / §6.5.2 — public-key validation (Normative).
 *
 * Decodes a P-256 public key from SEC1 bytes (compressed 33-byte `0x02`/`0x03`
 * form or uncompressed 65-byte `0x04` form), asserts it is a valid point on the
 * curve, and rejects the identity / point at infinity. MUST be called on every
 * received public key before any ECDH use (es/ee). Throws on a bad key (the
 * caller aborts the handshake with error 2013 BLE_AUTH_FAILED).
 *
 * Mirrors ble-crypto.mjs `validatePublicKey`. The 44-char Base64 wire-encoding
 * check (Pin 2) is a message-layer concern; this is the cryptographic validation
 * on the decoded bytes.
 *
 * @param pub  Compressed or uncompressed SEC1 public-key bytes.
 * @returns    The decoded, validated curve point (for downstream ECDH use).
 */
export function validatePublicKey(pub: Uint8Array): ReturnType<typeof p256.Point.fromBytes> {
  const point = p256.Point.fromBytes(pub); // throws on a non-decodable / off-curve / out-of-field X
  point.assertValidity();
  if (point.is0()) {
    throw new Error('BLE public key is the identity / point at infinity');
  }
  return point;
}
