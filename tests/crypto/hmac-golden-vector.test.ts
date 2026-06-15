import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { canonicalize } from '../../src/crypto/CanonicalJsonSerializer';
import { computeMac, verifyMac } from '../../src/crypto/HmacSigner';

/**
 * Cross-language HMAC golden-vector parity.
 *
 * These vectors are BYTE-IDENTICAL with ospp-sdk-php
 * (tests/Contract/Crypto/fixtures/hmac-golden-vectors.json). Both `expectedCanonicalJson` and
 * `expectedMac` were produced by an EXTERNAL oracle — never by an SDK — so this test pins sdk-ts's
 * canonical form + HMAC against an independent ground truth that ospp-sdk-php is pinned against too.
 * If TS's canonical form or HMAC ever drifts from the spec / from ospp-sdk-php, the matching golden
 * test in one of the two repos goes RED.
 *
 * Oracle: expectedCanonicalJson = OSPP Canonical Form (spec §4.8); expectedMac = openssl HMAC-SHA256.
 * Real spec payloads, safe-zone only (ASCII keys, integer/string scalars, no empty objects, no floats —
 * money/meter fields are integer atomic units per credit-amount.schema.json "integer, no floating point").
 */

interface GoldenVector {
  name: string;
  description: string;
  payloadSource: string;
  message: Record<string, unknown>;
  expectedCanonicalJson: string;
  expectedMac: string;
}

interface GoldenFixture {
  sessionKeyBase64: string;
  vectors: GoldenVector[];
}

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, 'fixtures', 'hmac-golden-vectors.json'), 'utf-8'),
) as GoldenFixture;

describe('HMAC golden vectors (cross-language parity with ospp-sdk-php)', () => {
  for (const vector of fixture.vectors) {
    describe(vector.name, () => {
      it('canonical form matches the external oracle (and therefore ospp-sdk-php)', () => {
        expect(canonicalize(vector.message)).toBe(vector.expectedCanonicalJson);
      });

      it('HMAC matches the external openssl oracle (and therefore ospp-sdk-php)', () => {
        expect(computeMac(fixture.sessionKeyBase64, vector.message)).toBe(vector.expectedMac);
      });

      it('verifyMac accepts the externally-computed MAC', () => {
        // A pre-existing top-level `mac` (e.g. the mac-strip vector) is overridden, exercising the strip path.
        const signed = { ...vector.message, mac: vector.expectedMac };
        expect(verifyMac(fixture.sessionKeyBase64, signed)).toBe(true);
      });
    });
  }
});
