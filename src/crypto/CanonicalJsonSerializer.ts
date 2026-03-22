/**
 * Canonical JSON serializer for OSPP HMAC computation.
 *
 * Source: spec/06-security.md §5.3.
 *
 * Algorithm:
 *   1. Take the complete message JSON object
 *   2. Remove the `mac` field if present
 *   3. Sort all keys alphabetically at every nesting level (recursive)
 *   4. Serialize as compact JSON (no whitespace)
 *   5. Encode as UTF-8 bytes
 */

/**
 * Recursively sort all object keys alphabetically.
 * Arrays preserve element order; non-object values pass through unchanged.
 */
function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Produce the canonical JSON string for an OSPP message.
 *
 * - Removes the `mac` field (top-level only, per spec)
 * - Sorts all keys alphabetically at every nesting level
 * - Serializes as compact JSON (no whitespace)
 */
export function canonicalize(message: Record<string, unknown>): string {
  const { mac: _, ...withoutMac } = message;
  return JSON.stringify(sortKeys(withoutMac));
}

/**
 * Produce the canonical form as a UTF-8 Buffer, ready for HMAC input.
 */
export function canonicalizeToBytes(message: Record<string, unknown>): Buffer {
  return Buffer.from(canonicalize(message), 'utf-8');
}
