/**
 * Buffer-returning variant of canonicalize, for HMAC input.
 *
 * Node-only: depends on Node's Buffer global. Lives behind /server entry.
 */

import { canonicalize } from './CanonicalJsonSerializer.js';

/** Produce the canonical form as a UTF-8 Buffer, ready for HMAC input. */
export function canonicalizeToBytes(message: Record<string, unknown>): Buffer {
  return Buffer.from(canonicalize(message), 'utf-8');
}
