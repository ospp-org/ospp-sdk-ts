/**
 * Cross-language canonical-form parity (sdk-ts side).
 *
 * The shared fixture canonical-json-vectors.json is BYTE-IDENTICAL with
 * ospp-sdk-php (tests/Contract/Crypto/fixtures/canonical-json-vectors.json).
 * Each vector gives a JSON value and the exact canonical string BOTH SDKs must
 * produce — so a canonicalization difference between the two languages turns
 * one repo's suite RED instead of turning up as a MAC failure on a live fleet.
 *
 * The spec names these two implementations as authoritative for
 * canonicalization, so a disagreement between them is not a bug in one of them;
 * it is a disagreement about what the protocol IS.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { canonicalize } from '../../src/crypto/CanonicalJsonSerializer';

interface Vector {
  name: string;
  why: string;
  input: Record<string, unknown>;
  canonical: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const { vectors } = JSON.parse(
  readFileSync(join(here, 'fixtures', 'canonical-json-vectors.json'), 'utf-8'),
) as { vectors: Vector[] };

describe('canonical form — shared cross-language vectors', () => {
  it('has the full vector set', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(11);
  });

  for (const v of vectors) {
    it(`${v.name}: ${v.why}`, () => {
      expect(canonicalize(v.input)).toBe(v.canonical);
    });
  }
});
