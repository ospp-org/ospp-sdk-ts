import { describe, it, expect } from 'vitest';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { verify as ecdsaVerify } from '../../src/crypto/EcdsaSigner';
import corpus from '../../src/test-vectors/crypto/tamper-rejection.json';

/**
 * TAMPER REJECTION — the negative direction, which this SDK had never proven.
 *
 * Every other crypto test here proves that a signature this SDK PRODUCES verifies.
 * That is a round trip, and a round trip is green for an implementation that
 * verifies nothing at all as long as it signs and checks with the same broken rule.
 * The conformance corpus could not close it either: every vector under
 * test-vectors/invalid/ is SCHEMA-invalid, and SchemaValidator.test.ts asserts only
 * `result.valid === false` without ever looking at `result.errors` — so "rejected"
 * there means "some error", never "the signature was wrong".
 *
 * Meanwhile conformance/test-cases asks an implementer, in four places
 * (TC-SEC-001 §50-51, TC-SEC-004 §34, TC-OFF-002 §122, TC-OFF-005 §220), to prove
 * that a tampered message is refused. Nothing in any of the three trees could pass
 * that test. This file is this SDK's half of the answer.
 *
 * Each vector carries everything needed with no OSPP-specific derivation left to do:
 * the exact bytes the signature covers, the signature, and the key inline. Three
 * mutation classes, and the corpus must contain all three:
 *
 *   BODY — the message moved, the signature is byte-identical → the signature is
 *          bound to CONTENT, not merely present.
 *   SIG  — the signature moved by exactly ONE BIT, the message is byte-identical →
 *          the signature is CHECKED. DER framing is preserved, so a rejection cannot
 *          come from the parser.
 *   KEY  — nothing moved; a different published key is offered → binding is to an
 *          IDENTITY.
 *
 * ANTI-VACUITY. Each case asserts the UNTAMPERED base VERIFIES first. Without that,
 * a wrong key format, a bad Base64 decode or a renamed export would all produce
 * `false` and be scored as a pass — a proof of refusal that cannot tell refusal from
 * breakage proves nothing.
 */

type Side = {
  signedBytesBase64: string;
  signature: string;
  key: string;
  keyMaterial: string;
  mustVerify: boolean;
};
type Vector = {
  id: string;
  surface: string;
  class: 'BODY' | 'SIG' | 'KEY';
  what: string;
  portable: { algorithm: 'ECDSA-P256-SHA256' | 'HMAC-SHA256'; base: Side; tampered: Side };
};

const vectors = corpus.vectors as unknown as Vector[];

/** Verify one portable triple with this SDK's own primitives. */
function verifySide(algorithm: Vector['portable']['algorithm'], side: Side): boolean {
  const bytes = Buffer.from(side.signedBytesBase64, 'base64');
  if (algorithm === 'HMAC-SHA256') {
    // The BLE transcripts and the §5.4 message MAC are raw HMAC over bytes that the
    // corpus already carries, so there is no payload object to hand to computeMac().
    const expected = createHmac('sha256', Buffer.from(side.keyMaterial, 'base64'))
      .update(bytes)
      .digest();
    const actual = Buffer.from(side.signature, 'base64');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  return ecdsaVerify(side.keyMaterial, bytes, side.signature);
}

describe('cryptographic tamper rejection (conformance corpus)', () => {
  // Anti-vacuity floors. A corpus that silently shrank to one surface would still
  // report "all passed" without these. They match the floors the spec-side verifier
  // carries (tools/verify-tamper-rejection.mjs), deliberately: two repositories
  // agreeing that the corpus is big enough is worth more than one.
  it('the vendored corpus is large enough to mean something', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(12);
    expect(new Set(vectors.map((v) => v.surface)).size).toBeGreaterThanOrEqual(8);
    expect(corpus.count).toBe(vectors.length);
  });

  it('covers all three mutation classes', () => {
    const classes = new Set(vectors.map((v) => v.class));
    for (const c of ['BODY', 'SIG', 'KEY']) expect(classes).toContain(c);
  });

  describe.each(vectors)('$id', (v) => {
    // ANTI-VACUITY, and it runs FIRST. If this fails, the refusal below is worthless.
    it('the untampered base verifies', () => {
      expect(verifySide(v.portable.algorithm, v.portable.base)).toBe(true);
    });

    it(`is REFUSED — ${v.what}`, () => {
      expect(verifySide(v.portable.algorithm, v.portable.tampered)).toBe(false);
    });

    it('the mutation is exactly what the vector claims', () => {
      const b = v.portable.base;
      const t = v.portable.tampered;
      if (v.class === 'SIG') {
        expect(t.signedBytesBase64).toBe(b.signedBytesBase64);
        const x = Buffer.from(b.signature, 'base64');
        const y = Buffer.from(t.signature, 'base64');
        expect(y.length).toBe(x.length); // DER framing intact
        let bits = 0;
        for (let i = 0; i < x.length; i++) {
          let d = x[i] ^ y[i];
          while (d) { bits += d & 1; d >>= 1; }
        }
        expect(bits).toBe(1);
      } else if (v.class === 'BODY') {
        expect(t.signature).toBe(b.signature);
        expect(t.signedBytesBase64).not.toBe(b.signedBytesBase64);
      } else {
        expect(t.signature).toBe(b.signature);
        expect(t.signedBytesBase64).toBe(b.signedBytesBase64);
        expect(t.keyMaterial).not.toBe(b.keyMaterial);
      }
    });
  });
});
