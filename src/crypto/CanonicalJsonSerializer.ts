/**
 * Canonical JSON serializer for OSPP cryptographic flows.
 *
 * Source: spec/06-security.md §4.8 (OSPP Canonical Form) — the single
 * deterministic JSON serialization used by §5.3 (HMAC of MQTT messages),
 * §6.2 (ECDSA of transaction receipts), and offline-pass signing.
 *
 * Algorithm:
 *   1. Take the complete message JSON object
 *   2. Remove the `mac` field if present (HMAC-specific pre-step per §5.3)
 *   3. Sort all keys alphabetically at every nesting level (recursive)
 *   4. Serialize as compact JSON (no whitespace)
 *   5. Encode as UTF-8 bytes (see canonicalizeToBytes in ./CanonicalJsonBytes)
 *
 * Materially similar to RFC 8785 (JCS) but does not require Unicode NFKC
 * normalization — OSPP message vocabulary is ASCII-only in practice
 * (UUIDs, ISO 8601 timestamps, PascalCase enums, identifier strings).
 *
 * This module is pure JS and browser-safe. The Buffer-returning variant
 * lives in ./CanonicalJsonBytes (Node-only).
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
