/**
 * Buffer-returning variant of canonicalize — §4.8 step 4.
 *
 * Node-only: depends on Node's Buffer global. Lives behind /server entry.
 *
 * Like {@link canonicalize}, and unlike this module before 0.14.0, it does NOT
 * strip `mac`; the identity `canonicalizeToBytes(v)` ===
 * `Buffer.from(canonicalize(v), 'utf-8')` holds, which is the whole point of a
 * "bytes variant". To produce MAC input, use `computeMac` — or
 * `canonicalizeForMac` if you need the string.
 */

import { canonicalize } from './CanonicalJsonSerializer.js';

/** Produce the canonical form as UTF-8 bytes (§4.8 step 4). */
export function canonicalizeToBytes(value: Record<string, unknown>): Buffer {
  return Buffer.from(canonicalize(value), 'utf-8');
}
