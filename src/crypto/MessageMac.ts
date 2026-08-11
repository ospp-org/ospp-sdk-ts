/**
 * HMAC-SHA256 message signing and verification — browser-safe.
 *
 * Source: spec/06-security.md §5.2–§5.5, §5.7.
 *
 * MAC: base64(HMAC-SHA256(sessionKey, UTF-8(canonical_json)))
 *
 * **Why this is browser-safe and not a `/server` module.** Everything on the
 * wire is signed (§5.6), which makes verifying an inbound MAC something a
 * STATION does on every message it receives — and station-side code imports
 * `@ospp/protocol`, not `@ospp/protocol/server`. While the only MAC
 * implementation lived behind `node:crypto` on the server subpath, the
 * reference implementation could not verify an inbound MAC at all from its main
 * entry point. That is packaging, not cryptography, and it is fixed here by
 * building on `@noble/hashes` — the same pure-JS pipeline the BLE SessionCrypto
 * already uses, and already validated byte-identically against the spec's
 * conformance corpus.
 *
 * `@ospp/protocol/server` re-exports all of this, so existing server-side
 * imports are unaffected.
 */

import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { canonicalizeForMac } from './CanonicalJsonSerializer.js';

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Browser-safe standard-alphabet Base64 (RFC 4648) decode, or null if not base64. */
function base64ToBytes(b64: string): Uint8Array | null {
  const clean = b64.replace(/[\r\n\s]/g, '').replace(/=+$/, '');
  if (clean.length === 0) return null;

  const out = new Uint8Array((clean.length * 3) >> 2);
  let acc = 0;
  let bits = 0;
  let o = 0;

  for (let i = 0; i < clean.length; i++) {
    const v = B64_ALPHABET.indexOf(clean[i]);
    // Strict, unlike Node's decoder, which silently skips stray characters.
    // Leniency here is what let a garbage key become the empty HMAC key.
    if (v < 0) return null;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >>> bits) & 0xff;
      acc &= (1 << bits) - 1;
    }
  }

  return o === out.length ? out : out.subarray(0, o);
}

/** Browser-safe standard-alphabet Base64 (RFC 4648) encode, with padding. */
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];

    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64_ALPHABET[b2 & 0x3f];
  }
  return out;
}

/**
 * Constant-time byte comparison.
 *
 * §5.5: "Implementations MUST use constant-time comparison to prevent timing
 * attacks." `crypto.timingSafeEqual` is Node-only, so this is the browser-safe
 * equivalent: it accumulates the XOR of every byte pair and never short-circuits.
 * The length check leaks only the length, which the MAC's own encoding already
 * publishes.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Decode a session key, or null if none is usable.
 *
 * "Usable" is: non-blank, and valid base64. Length is deliberately NOT checked.
 * §5.2 requires the SERVER to generate 32 bytes, but
 * `boot-notification-response.schema.json` accepts a base64 string of 1 to 1024
 * characters and no clause makes a station reject a conforming response that
 * carries a different length. An SDK stricter than the schema would refuse a
 * server the schema admits.
 */
function decodeKey(sessionKey: unknown): Uint8Array | null {
  if (typeof sessionKey !== 'string' || sessionKey.trim() === '') return null;
  return base64ToBytes(sessionKey);
}

/** Whether a usable session key is held. Gate on this before building a message to send. */
export function isUsableSessionKey(sessionKey: unknown): boolean {
  return decodeKey(sessionKey) !== null;
}

/**
 * Compute the HMAC-SHA256 MAC for an OSPP message.
 *
 * @throws When no usable session key is held. §5.7: "A sender holding no key
 *   MUST refuse to send. It MUST NOT publish the message unsigned. It MUST log
 *   the refusal and surface it to the operator, and MUST NOT silently drop it
 *   without a record." Throwing is the only response that is neither of the two
 *   the clause forbids.
 */
export function computeMac(sessionKey: string, message: Record<string, unknown>): string {
  const keyBytes = decodeKey(sessionKey);

  if (keyBytes === null) {
    // Sending unsigned is the option that makes the immediate symptom go away
    // and hands the attacker the whole mechanism: "a server that publishes an
    // unsigned StartService has produced exactly the message the MAC exists to
    // stop, and has taught the fleet to accept it." The recovery is always the
    // same and already exists — get a key, which means boot.
    throw new Error(
      'Refusing to sign: no usable session key is held. A sender with no key MUST NOT ' +
        'publish unsigned (spec 06-security.md §5.7). Recover by booting, which issues one.',
    );
  }

  // canonicalizeForMac, not canonicalize: §5.3 step 1 strips `mac` before §4.8
  // runs. Until 0.14.0 the stripping lived inside canonicalize() itself.
  return bytesToBase64(hmac(sha256, keyBytes, utf8ToBytes(canonicalizeForMac(message))));
}

/**
 * Verify the HMAC-SHA256 MAC on a received OSPP message.
 *
 * Returns false rather than throwing: a receiver rejects a message, it does not
 * crash on one. §5.7 Receiving: "No session key held for the peer | 1013
 * MAC_MISSING | Reject the message. A receiver that holds no key cannot verify,
 * and cannot therefore accept."
 */
export function verifyMac(sessionKey: string, message: Record<string, unknown>): boolean {
  const receivedMac = message.mac;
  if (typeof receivedMac !== 'string') return false;

  if (decodeKey(sessionKey) === null) return false;

  const received = base64ToBytes(receivedMac);
  if (received === null) return false;

  const expected = base64ToBytes(computeMac(sessionKey, message));
  if (expected === null) return false;

  return constantTimeEqual(received, expected);
}

/**
 * Sign an OSPP message: compute the MAC and return a copy carrying it.
 *
 * @throws When no usable session key is held — see {@link computeMac}.
 */
export function signMessage<T extends Record<string, unknown>>(
  sessionKey: string,
  message: T,
): T & { mac: string } {
  return { ...message, mac: computeMac(sessionKey, message) };
}
