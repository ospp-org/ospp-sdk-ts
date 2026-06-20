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
import { hkdf, expand } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';

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

// Pin 3 key-schedule constants — VERBATIM from spec generate-ble-vectors.mjs /
// 06-security.md §6.5. The _V2 salt domain-separates this ECDH construction from
// the retired LTK one; the directional + confirmation labels are fixed ASCII.
// Do NOT alter — cross-language byte-identity depends on these exact strings.
const SALT_V2 = utf8ToBytes('OSPP_BLE_SESSION_V2');
const KDF_LABEL_A2S = utf8ToBytes('OSPP-BLE-v0.6.0-key-app-to-station');
const KDF_LABEL_S2A = utf8ToBytes('OSPP-BLE-v0.6.0-key-station-to-app');
const SESSION_CONFIRM_LABEL = utf8ToBytes('AuthResponse_OK');

export interface DeriveSessionKeysParams {
  /** es = ECDH(appEphemeralPriv, stationStaticPub) X — 32 bytes (ecdhSharedX). */
  es: Uint8Array;
  /** ee = ECDH(appEphemeralPriv, stationEphemeralPub) X — 32 bytes (ecdhSharedX). */
  ee: Uint8Array;
  /** appNonce — 32 decoded bytes from Hello. */
  appNonce: Uint8Array;
  /** stationNonce — 32 decoded bytes from Challenge. */
  stationNonce: Uint8Array;
  /** Client device identity from Hello (UTF-8; length-prefixed into `info`). */
  deviceId: string;
  /** Pin 4 transcript hash — 32 bytes (transcriptHash). */
  transcriptHash: Uint8Array;
}

export interface BleSessionKeys {
  /** 32-byte master session key (also keys sessionProof + the confirmation). */
  sessionKey: Uint8Array;
  /** 32-byte AEAD key for app→station frames (§6.5.3). */
  kAppToStation: Uint8Array;
  /** 32-byte AEAD key for station→app frames (§6.5.3). */
  kStationToApp: Uint8Array;
  /** HMAC-SHA256(SessionKey, "AuthResponse_OK"), carried in AuthResponse. */
  sessionKeyConfirmation: Uint8Array;
}

/**
 * Pin 3 / §6.5 — BLE session key schedule, directional sub-keys, and key
 * confirmation. Mirrors spec generate-ble-vectors.mjs (constants verbatim):
 *
 *   IKM        = es ‖ ee ‖ appNonce ‖ stationNonce          (4 × 32 = 128 bytes)
 *   salt       = UTF8("OSPP_BLE_SESSION_V2")
 *   info       = LP(deviceId) ‖ LP(transcriptHash)           (Pin 3, injective — N23)
 *   SessionKey = HKDF-SHA256(IKM, salt, info, 32)
 *   k_app→stn  = HKDF-Expand(SessionKey, "OSPP-BLE-v0.6.0-key-app-to-station", 32)
 *   k_stn→app  = HKDF-Expand(SessionKey, "OSPP-BLE-v0.6.0-key-station-to-app", 32)
 *   confirm    = HMAC-SHA256(SessionKey, "AuthResponse_OK")
 *
 * Browser-safe (@noble/hashes + Uint8Array). The 256-bit inputs (es/ee, both
 * nonces, transcriptHash) MUST be exactly 32 bytes.
 */
export function deriveSessionKeys(params: DeriveSessionKeysParams): BleSessionKeys {
  const { es, ee, appNonce, stationNonce, deviceId, transcriptHash: transcript } = params;
  for (const [name, value] of [
    ['es', es],
    ['ee', ee],
    ['appNonce', appNonce],
    ['stationNonce', stationNonce],
    ['transcriptHash', transcript],
  ] as const) {
    if (value.length !== 32) {
      throw new Error(`deriveSessionKeys: ${name} must be 32 bytes (got ${value.length})`);
    }
  }
  const ikm = concatBytes(es, ee, appNonce, stationNonce);
  const info = concatBytes(lp(deviceId), lp(transcript));
  const sessionKey = hkdf(sha256, ikm, SALT_V2, info, 32);
  const kAppToStation = expand(sha256, sessionKey, KDF_LABEL_A2S, 32);
  const kStationToApp = expand(sha256, sessionKey, KDF_LABEL_S2A, 32);
  const sessionKeyConfirmation = hmac(sha256, sessionKey, SESSION_CONFIRM_LABEL);
  return { sessionKey, kAppToStation, kStationToApp, sessionKeyConfirmation };
}

/** §6.5.1 message-type label, length-prefixed into the sessionProof input (verbatim). */
const SESSION_PROOF_TYPE = 'OfflineAuthRequest';

/**
 * §6.5.1 / ble-handshake.md §4.1 — sessionProof (Normative).
 *
 *   sessionProof = HMAC-SHA256( SessionKey,
 *                    LP("OfflineAuthRequest") ‖ LP(passId) ‖ LP(decimal(counter)) )
 *
 * Proves the app holds THIS handshake's SessionKey and binds the OfflineAuthRequest
 * to the session. `decimal(counter)` is the counter as its shortest base-10 ASCII
 * string — NOT a U64BE binary (that is the AEAD nonce's encoding, Pin 5). The
 * length-prefix (lp) makes (type, passId, counter) injective (closes finding N1's
 * empty-concatenation ambiguity). Returns the raw 32-byte HMAC; Base64-encode it
 * for the on-wire `sessionProof` field. Mirrors generate-ble-vectors.mjs.
 */
export function sessionProof(
  sessionKey: Uint8Array,
  passId: string,
  counter: number | bigint,
): Uint8Array {
  const message = concatBytes(lp(SESSION_PROOF_TYPE), lp(passId), lp(String(counter)));
  return hmac(sha256, sessionKey, message);
}
