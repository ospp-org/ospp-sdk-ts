/**
 * HMAC-SHA256 message signing and verification for OSPP.
 *
 * Source: spec/06-security.md §5.2–§5.5, §5.7.
 *
 * Session key: base64-encoded, from the BootNotification RESPONSE.
 * MAC:         base64(HMAC-SHA256(sessionKey, UTF-8(canonical_json)))
 * Verification MUST use timing-safe comparison (crypto.timingSafeEqual).
 *
 * Both directions fail closed (§5.7). They are the same condition — no usable
 * key — read from two ends, and they act differently only in HOW they refuse: a
 * sender throws, because its alternatives are to publish unsigned or to drop
 * silently and the clause forbids both; a receiver returns false, because
 * rejecting a message is its normal business.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalizeToBytes } from './CanonicalJsonBytes.js';

/**
 * Decode a session key, or null if none is usable.
 *
 * "Usable" is: non-blank, and valid base64. Length is deliberately NOT checked.
 * §5.2 requires the SERVER to generate 32 bytes, but
 * `boot-notification-response.schema.json` accepts a base64 string of 1 to 1024
 * characters and no clause makes a station reject a conforming response that
 * carries a different length. An SDK stricter than the schema would refuse a
 * server the schema admits.
 *
 * Node's `Buffer.from(s, 'base64')` is lenient — it skips non-alphabet
 * characters rather than failing — so a round-trip check is what actually
 * detects garbage.
 */
function decodeKey(sessionKey: unknown): Buffer | null {
  if (typeof sessionKey !== 'string' || sessionKey.trim() === '') {
    return null;
  }

  const decoded = Buffer.from(sessionKey, 'base64');
  if (decoded.length === 0) {
    return null;
  }

  // Re-encoding a valid base64 string reproduces it, modulo padding and any
  // characters Node silently dropped. If it does not, the input was not a key.
  const normalized = sessionKey.replace(/[\r\n\s]/g, '').replace(/=+$/, '');
  if (decoded.toString('base64').replace(/=+$/, '') !== normalized) {
    return null;
  }

  return decoded;
}

/** Whether a usable session key is held. Exported so callers can gate before building a message. */
export function isUsableSessionKey(sessionKey: unknown): boolean {
  return decodeKey(sessionKey) !== null;
}

/**
 * Compute the HMAC-SHA256 MAC for an OSPP message.
 *
 * @param sessionKey  Base64-encoded session key.
 * @param message     The complete message object (mac field is ignored if present).
 * @returns           Base64-encoded HMAC-SHA256 string.
 * @throws            When no usable session key is held. §5.7: "A sender
 *   holding no key MUST refuse to send. It MUST NOT publish the message
 *   unsigned. It MUST log the refusal and surface it to the operator, and MUST
 *   NOT silently drop it without a record." Throwing is the only response that
 *   is neither of the two the clause forbids.
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

  const canonical = canonicalizeToBytes(message);
  return createHmac('sha256', keyBytes).update(canonical).digest('base64');
}

/**
 * Verify the HMAC-SHA256 MAC on a received OSPP message.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param sessionKey  Base64-encoded session key.
 * @param message     The received message object (must contain `mac` field).
 * @returns           `true` if the MAC is valid, `false` otherwise.
 */
export function verifyMac(sessionKey: string, message: Record<string, unknown>): boolean {
  const receivedMac = message.mac;
  if (typeof receivedMac !== 'string') {
    return false;
  }

  // §5.7 Receiving: "No session key held for the peer | 1013 MAC_MISSING |
  // Reject the message. A receiver that holds no key cannot verify, and cannot
  // therefore accept."
  if (decodeKey(sessionKey) === null) {
    return false;
  }

  const expectedMac = computeMac(sessionKey, message);

  const receivedBuf = Buffer.from(receivedMac, 'base64');
  const expectedBuf = Buffer.from(expectedMac, 'base64');

  if (receivedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(receivedBuf, expectedBuf);
}

/**
 * Sign an OSPP message in-place: compute the MAC and set the `mac` field.
 *
 * @param sessionKey  Base64-encoded session key.
 * @param message     The message object to sign. The `mac` field will be set.
 * @returns           The message with the `mac` field populated.
 * @throws            When no usable session key is held — see {@link computeMac}.
 */
export function signMessage<T extends Record<string, unknown>>(
  sessionKey: string,
  message: T,
): T & { mac: string } {
  const mac = computeMac(sessionKey, message);
  return { ...message, mac };
}
