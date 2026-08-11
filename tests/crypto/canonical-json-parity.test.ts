/**
 * Canonical-form conformance (sdk-ts side).
 *
 * `fixtures/canonical-form.json` is VENDORED BYTE-IDENTICALLY from the spec:
 * `conformance/test-vectors/crypto/canonical-form.json` at the ref in
 * `.spec-ref`, enforced by `npm run check:crypto-vectors` in CI. It is the same
 * file ospp-sdk-php vendors, so the two SDKs no longer agree with each other by
 * assertion in a comment — they agree because both are compared to one upstream.
 *
 * The `canonical` strings are the ORACLE. The spec recomputed them from the
 * §4.8.1 rule text in a third implementation rather than adopting either SDK's
 * output, which is the only reason they are evidence: a vector generated from
 * an implementation can only ever confirm that implementation.
 *
 * A disagreement here is not a bug in one SDK; it is a disagreement about what
 * the protocol IS.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { canonicalize, canonicalizeForMac } from '../../src/crypto/CanonicalJsonSerializer';

interface Vector {
  name: string;
  why: string;
  input: Record<string, unknown>;
  canonical: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const load = <T>(file: string): T =>
  JSON.parse(readFileSync(join(here, 'fixtures', file), 'utf-8')) as T;

const { vectors } = load<{ vectors: Vector[] }>('canonical-form.json');

describe('canonical form — spec conformance corpus', () => {
  it('has the full vector set', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(17);
  });

  for (const v of vectors) {
    it(`${v.name}: ${v.why}`, () => {
      expect(canonicalize(v.input)).toBe(v.canonical);
    });
  }

  /**
   * Falsifiability — the spec's Category 20 check, run here on the vendored copy.
   *
   * A corpus that no longer separates right from wrong passes silently, and a
   * green suite then means nothing. So run the defect this SDK actually shipped
   * — `Object.keys().sort()` (UTF-16 order) followed by rebuilding a plain
   * object (which re-hoists integer-like keys) — over the same vectors and
   * require that the corpus REJECTS it. If every vector accepts a broken
   * canonicalizer, the discriminating vectors have been removed or weakened and
   * this test says so instead of reporting green.
   */
  it('rejects the pre-0.14.0 UTF-16-sorting canonicalizer', () => {
    const broken = (value: unknown): string => {
      if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
      if (Array.isArray(value)) return `[${value.map(broken).join(',')}]`;
      const rebuilt: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        rebuilt[k] = (value as Record<string, unknown>)[k];
      }
      return `{${Object.keys(rebuilt)
        .map((k) => `${JSON.stringify(k)}:${broken(rebuilt[k])}`)
        .join(',')}}`;
    };

    const discriminating = vectors.filter((v) => broken(v.input) !== v.canonical);
    expect(
      discriminating.map((v) => v.name),
      'the corpus no longer separates UTF-16 ordering from the UTF-8 rule',
    ).not.toHaveLength(0);
  });
});

/**
 * §4.8 vs §5.3 step 1 — the boundary, and the divergence it hid.
 *
 * Not vendored from the spec: the spec's corpus deliberately carries no message
 * with a `mac`, because §4.8 is defined over any JSON value and says nothing
 * about the field. That silence is what let sdk-ts strip `mac` inside
 * canonicalize() while ospp-sdk-php stripped it one layer up in MacSigner —
 * two different answers for every message that carries one, and no vector in
 * either repo had a `mac` to notice with.
 */
describe('canonical form — mac is stripped by §5.3, not by §4.8', () => {
  interface MacVector extends Vector {
    canonicalForMac: string;
  }
  const { vectors: macVectors } = load<{ vectors: MacVector[] }>('canonical-mac-strip.json');

  it('has the full vector set', () => {
    expect(macVectors.length).toBeGreaterThanOrEqual(4);
  });

  for (const v of macVectors) {
    it(`${v.name}: ${v.why}`, () => {
      expect(canonicalize(v.input), 'pure §4.8 form keeps mac').toBe(v.canonical);
      expect(canonicalizeForMac(v.input), '§5.3 step 1 removes the top-level mac').toBe(
        v.canonicalForMac,
      );
    });
  }
});
