/**
 * Canonical JSON serializer for OSPP cryptographic flows.
 *
 * Source: spec/06-security.md §4.8 (OSPP Canonical Form) — the single
 * deterministic JSON serialization used by §5.3 (HMAC of MQTT messages),
 * §6.2 (ECDSA of transaction receipts), and offline-pass signing.
 *
 * Algorithm (§4.8.1):
 *   1. Sort all keys at every nesting level by the UTF-8 BYTES of the key
 *   2. Serialize compactly (no whitespace)
 *   3. Encode as UTF-8 bytes (see canonicalizeToBytes in ./CanonicalJsonBytes)
 *
 * Removing `mac` is NOT part of this. It is §5.3 step 1, a pre-step that
 * belongs to the MAC computation and to nothing else — see
 * {@link canonicalizeForMac}.
 *
 * Materially similar to RFC 8785 (JCS) but does not require Unicode NFKC
 * normalization — OSPP message vocabulary is ASCII-only in practice
 * (UUIDs, ISO 8601 timestamps, PascalCase enums, identifier strings).
 *
 * This module is pure JS and browser-safe. The Buffer-returning variant
 * lives in ./CanonicalJsonBytes (Node-only).
 *
 * ---
 *
 * **Why this builds the string by hand instead of calling `JSON.stringify`
 * on a sorted object.** Two separate reasons, and only the first is a sorting
 * problem:
 *
 * 1. **`Array.prototype.sort()` is not byte order.** Its default comparator
 *    compares UTF-16 code units. §4.8.1 step 1 requires "lexicographic byte
 *    ordering of the UTF-8 encoded key strings". The two disagree for every
 *    key pair that straddles the BMP boundary, because a supplementary
 *    character is a surrogate pair whose first unit is in `D800`–`DBFF` and
 *    therefore sorts *below* any key starting `E000`–`FFFF` — while its UTF-8
 *    encoding starts `F0` and sorts *above*. `{U+FFFD, U+1D400}` is the
 *    minimal case: `.sort()` yields `1D400, FFFD`, UTF-8 yields `FFFD, 1D400`.
 *
 * 2. **A plain object cannot hold the order you just computed.** JavaScript
 *    objects keep integer-like keys in ascending *numeric* order, ahead of
 *    every string key, no matter what order they were inserted in — so
 *    rebuilding a sorted object throws the sort away for exactly those keys.
 *    `{"2":…,"10":…}` re-emerges as `2` then `10`; byte order is `10` then
 *    `2`, since `'1'` (0x31) precedes `'2'` (0x32). No comparator fixes this,
 *    because the loss happens after the comparator has run. This is not an
 *    exotic input: it is ordinary JSON, and the open-object sites on the
 *    signed path — `DataTransfer.data`, `SecurityEvent.details`,
 *    `StartService.params` — accept vendor-defined keys the protocol never
 *    constrains.
 *
 * Emitting the string directly is what avoids both. Note that the escaping is
 * still delegated to `JSON.stringify` on individual strings, which is already
 * exactly §4.8.1 step 3: it escapes control characters, `"` and `\`, and
 * emits everything else literally — including U+2028/U+2029, which it has
 * never escaped. (`ospp-sdk-php` needs `JSON_UNESCAPED_LINE_TERMINATORS` to
 * reach the same place; that is the same divergence read from the other end.)
 *
 * The one case where `JSON.stringify` does not emit literally is a lone
 * surrogate, which it escapes as `\udXXX`. That is not a deviation worth
 * correcting: a lone surrogate has no UTF-8 encoding at all, so it has no
 * canonical form under step 4, and PHP's `json_encode` rejects it outright.
 */

const encoder = new TextEncoder();

/**
 * Compare two keys by the UTF-8 bytes of their encodings — §4.8.1 step 1.
 *
 * Encodings are computed once per key per object (see `emitObject`) rather
 * than inside the comparator, which would re-encode O(n log n) times.
 */
function compareUtf8(a: Uint8Array, b: Uint8Array): number {
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return a.length - b.length;
}

/**
 * Emit one value, or `undefined` for a value JSON has no representation for.
 *
 * `undefined` is the same signal `JSON.stringify` uses: such a value makes its
 * key vanish from an object, and becomes `null` inside an array. Mirroring
 * that keeps this a drop-in replacement rather than a second dialect.
 */
function emit(value: unknown): string | undefined {
  // `toJSON` first — Date and anything else that defines its own wire form.
  if (value !== null && typeof value === 'object') {
    const maybe = value as { toJSON?: unknown };
    if (typeof maybe.toJSON === 'function') {
      value = (maybe.toJSON as () => unknown).call(value);
    }
  }

  if (value === null) {
    return 'null';
  }

  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      // Non-finite numbers have no JSON form; JSON.stringify emits null.
      return Number.isFinite(value) ? JSON.stringify(value) : 'null';
    case 'bigint':
      throw new TypeError('Do not know how to serialize a BigInt');
    case 'undefined':
    case 'function':
    case 'symbol':
      return undefined;
  }

  if (Array.isArray(value)) {
    // §4.8.1 step 1: array element order is preserved.
    return `[${value.map((item) => emit(item) ?? 'null').join(',')}]`;
  }

  // A Map or Set canonicalizes to `{}` under Object.keys — a signature over
  // nothing that still verifies. Refuse it rather than sign it. (Same class as
  // the empty-object bug this serializer's vectors exist for.)
  if (value instanceof Map || value instanceof Set) {
    throw new TypeError(
      `Cannot canonicalize a ${value.constructor.name}: it has no JSON form and would ` +
        'silently canonicalize to {}. Convert it to a plain object first.',
    );
  }

  return emitObject(value as Record<string, unknown>);
}

function emitObject(source: Record<string, unknown>): string {
  const keys = Object.keys(source).map((key) => ({ key, bytes: encoder.encode(key) }));
  keys.sort((a, b) => compareUtf8(a.bytes, b.bytes));

  const members: string[] = [];
  for (const { key } of keys) {
    const encoded = emit(source[key]);
    if (encoded === undefined) {
      continue; // as JSON.stringify does: the key does not appear
    }
    members.push(`${JSON.stringify(key)}:${encoded}`);
  }

  return `{${members.join(',')}}`;
}

/**
 * Produce the OSPP Canonical Form of a JSON value — §4.8, and nothing else.
 *
 * - Sorts all keys by UTF-8 byte order at every nesting level
 * - Serializes as compact JSON (no whitespace)
 *
 * **This no longer strips `mac`.** Until 0.14.0 it did, which made it the only
 * one of the three reference implementations that conflated §4.8 with §5.3
 * step 1: `ospp-sdk-php` keeps `CanonicalJsonSerializer::serialize()` pure and
 * strips in `MacSigner`, and the spec's own `tools/canonical-form.mjs` does not
 * mention `mac` at all. Canonical form is defined over any JSON value — receipt
 * bodies (§6.2) and OfflinePass payloads have no `mac` field and never did — so
 * a serializer that deletes a key named `mac` was quietly corrupting any value
 * that legitimately carried one. Use {@link canonicalizeForMac} for MAC input.
 */
export function canonicalize(value: Record<string, unknown>): string {
  return emitObject(value);
}

/**
 * Canonical form for MAC input: §5.3 step 1 then §4.8.
 *
 * §5.3 step 1: "Remove the `mac` field from the message envelope if present —
 * the MAC field cannot be part of the input that produces it." Top level only,
 * and the caller's object is not mutated.
 *
 * The PHP twin is `MacSigner::canonicalize()`.
 */
export function canonicalizeForMac(message: Record<string, unknown>): string {
  const { mac: _mac, ...withoutMac } = message;
  return emitObject(withoutMac);
}
