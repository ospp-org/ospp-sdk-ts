/**
 * HMAC-SHA256 message signing and verification for OSPP.
 *
 * Source: spec/06-security.md §5.2–§5.5.
 *
 * Session key: 32 bytes, base64-encoded, from BootNotification RESPONSE.
 * MAC:         base64(HMAC-SHA256(sessionKey, UTF-8(canonical_json)))
 * Verification MUST use timing-safe comparison (crypto.timingSafeEqual).
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { canonicalize, canonicalizeToBytes } from './CanonicalJsonSerializer';

/**
 * Compute the HMAC-SHA256 MAC for an OSPP message.
 *
 * @param sessionKey  Base64-encoded 32-byte session key.
 * @param message     The complete message object (mac field is ignored if present).
 * @returns           Base64-encoded HMAC-SHA256 string.
 */
export function computeMac(sessionKey: string, message: Record<string, unknown>): string {
  const keyBytes = Buffer.from(sessionKey, 'base64');
  const canonical = canonicalizeToBytes(message);
  return createHmac('sha256', keyBytes).update(canonical).digest('base64');
}

/**
 * Verify the HMAC-SHA256 MAC on a received OSPP message.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param sessionKey  Base64-encoded 32-byte session key.
 * @param message     The received message object (must contain `mac` field).
 * @returns           `true` if the MAC is valid, `false` otherwise.
 */
export function verifyMac(sessionKey: string, message: Record<string, unknown>): boolean {
  const receivedMac = message.mac;
  if (typeof receivedMac !== 'string') {
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
 * @param sessionKey  Base64-encoded 32-byte session key.
 * @param message     The message object to sign. The `mac` field will be set.
 * @returns           The message with the `mac` field populated.
 */
export function signMessage<T extends Record<string, unknown>>(
  sessionKey: string,
  message: T,
): T & { mac: string } {
  const mac = computeMac(sessionKey, message);
  return { ...message, mac };
}
