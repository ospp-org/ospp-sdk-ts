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
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';

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

/**
 * Pin 1 — left-pad a big-endian byte string to exactly 32 bytes.
 *
 * Applied UNCONDITIONALLY to every ECDH shared-secret X (06-security.md §6.5
 * Pin 1): a no-op when the value is already full-width, a correction when a
 * backend strips leading zero bytes. This is the byte-parity guarantee with
 * PHP `openssl_pkey_derive` / mbedTLS (which can return < 32 bytes for ~1/256 of
 * shared secrets — the EC-scalar 0.5.7 class). Mirrors ble-crypto.mjs leftPad32.
 *
 * @throws if the input is wider than 32 bytes.
 */
export function leftPad32(x: Uint8Array): Uint8Array {
  if (x.length > 32) {
    throw new Error(`leftPad32: input ${x.length} > 32 bytes`);
  }
  const out = new Uint8Array(32);
  out.set(x, 32 - x.length);
  return out;
}

/**
 * Pin 1 / §6.5 — ECDH P-256 shared secret, encoded as the X-coordinate of the
 * shared point, big-endian, exactly 32 bytes, zero-left-padded.
 *
 * @noble/curves `getSharedSecret` returns the shared point in compressed SEC1
 * form (33 bytes: `0x02`/`0x03` prefix ‖ 32-byte X). Pin 1: strip the prefix,
 * take the X coordinate only, and `leftPad32` it unconditionally. (Tolerant of a
 * 65-byte uncompressed or bare 32-byte return across @noble versions.) Mirrors
 * the @noble normalisation documented in ble-crypto.mjs `ecdhSharedX`.
 *
 * Inputs are raw bytes: `priv` = 32-byte scalar, `peerPub` = compressed or
 * uncompressed SEC1 public key (validate it first with `validatePublicKey`).
 */
export function ecdhSharedX(priv: Uint8Array, peerPub: Uint8Array): Uint8Array {
  const shared = p256.getSharedSecret(priv, peerPub);
  let x: Uint8Array;
  if (shared.length === 33) {
    x = shared.subarray(1); // 0x02/0x03 ‖ X → X
  } else if (shared.length === 65) {
    x = shared.subarray(1, 33); // 0x04 ‖ X ‖ Y → X
  } else if (shared.length === 32) {
    x = shared; // already X-only
  } else {
    throw new Error(`ecdhSharedX: unexpected @noble shared-secret length ${shared.length}`);
  }
  return leftPad32(x);
}

/** U16BE(n) — unsigned 16-bit big-endian length prefix (Pin 3 / Pin 4). */
function u16be(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > 0xffff) {
    throw new Error(`u16be: out of range: ${n}`);
  }
  return new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
}

/**
 * LP(x) = U16BE(byteLength(x)) ‖ x — the single length-prefix used by the HKDF
 * `info` (Pin 3), the handshake transcript (Pin 4), and the sessionProof
 * (§6.5.1). Length-prefixing makes concatenations injective (closes finding
 * N23). Strings are UTF-8 encoded. Mirrors ble-crypto.mjs `lp`.
 */
export function lp(x: Uint8Array | string): Uint8Array {
  const bytes = typeof x === 'string' ? utf8ToBytes(x) : x;
  return concatBytes(u16be(bytes.length), bytes);
}

/**
 * Pin 4 / §6.5 — handshake transcript hash.
 *
 *   transcriptHash = SHA-256( LP16(helloBytes) ‖ LP16(challengeBytes) )
 *
 * Hashes the RAW, fully-reassembled wire octets of each message exactly as
 * transmitted/received (the bytes off ble-transport, before AEAD framing). An
 * implementation MUST NOT parse the JSON and re-serialise / canonicalise / re-
 * order it — the deliberate opposite of Pin 8. Binding this into the key
 * schedule `info` makes the SessionKey depend on every handshake field, so any
 * tampering fails at the first AEAD frame or the sessionProof check. Mirrors
 * ble-crypto.mjs.
 */
export function transcriptHash(helloBytes: Uint8Array, challengeBytes: Uint8Array): Uint8Array {
  return sha256(concatBytes(lp(helloBytes), lp(challengeBytes)));
}
