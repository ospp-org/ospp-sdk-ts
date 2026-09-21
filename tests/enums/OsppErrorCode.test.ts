import { describe, it, expect } from 'vitest';
import {
  OsppErrorCode,
  OSPP_ERROR_REGISTRY,
  type OsppErrorMeta,
  type OsppErrorCategory,
} from '../../src/enums/OsppErrorCode';

describe('OsppErrorCode', () => {
  const allCodes = Object.values(OsppErrorCode).filter(
    (v): v is number => typeof v === 'number',
  );

  it('should have exactly 120 error codes', () => {
    // v0.5.2: spec v0.4.2 07-errors.md §3.2 added 2014-2017 (4 codes): 102 → 106.
    // v0.6.2: spec 07-errors.md §3.2 added 2018 SERVER_AUTH_NONCE_MISMATCH: 106 → 107.
    // v0.8.0: spec 07-errors.md added the seven provisioning-identity codes —
    //         2019 (§3.2) and 4015-4020 (§3.4): 107 → 114. Matches the spec's
    //         own stated "Total: 114 standard error codes" (07-errors.md §1.1).
    // v0.11.0: 114 → 118 with 3017 PROGRAM_NOT_DECLARED and 3018 TOPOLOGY_MISMATCH.
    // v0.39.0: 119 → 120 with 3020 BINDING_UNCOVERED (spec v0.42.0 §3.3).
    expect(allCodes).toHaveLength(120);
  });

  it('should have unique numeric values', () => {
    expect(new Set(allCodes).size).toBe(allCodes.length);
  });

  describe('range distribution', () => {
    const byRange = (lo: number, hi: number) =>
      allCodes.filter((c) => c >= lo && c <= hi);

    it('should have 15 transport errors (1xxx)', () => {
      expect(byRange(1000, 1999)).toHaveLength(15);
    });

    it('should have 20 auth errors (2xxx)', () => {
      // v0.5.2: 14 → 18 (2014/2015/2016/2017); v0.6.2: → 19 (2018); v0.8.0: → 20 (2019).
      expect(byRange(2000, 2999)).toHaveLength(20);
    });

    it('should have 21 session/bay errors (3xxx)', () => {
      // v0.39.0: 20 → 21 with 3020 BINDING_UNCOVERED.
      expect(byRange(3000, 3999)).toHaveLength(21);
    });

    it('should have 20 payment/credit errors (4xxx)', () => {
      // v0.8.0: 14 → 20 with 4015-4020. 4.01x filled to 4019; 4020 opened 4.02x.
      expect(byRange(4000, 4999)).toHaveLength(20);
    });

    it('should have 35 hardware/software errors (5xxx)', () => {
      expect(byRange(5000, 5999)).toHaveLength(35);
    });

    it('should have 9 server errors (6xxx)', () => {
      expect(byRange(6000, 6999)).toHaveLength(9);
    });

    // WAS `expect(15 + 20 + 20 + 20 + 34 + 9).toBe(118)` — an arithmetic identity that
    // never touched the registry and so could not fail. Both sides constant-folded to
    // 118, so it would have passed over an empty registry, a renamed enum, or a deleted
    // one. It was also WRONG twice over: its 5xxx term said 34 where the block seven
    // lines above asserts 35, and its total said 118 where the assertion 37 lines above
    // asserts the real count. It was a literal-vs-literal comparison in all six of its
    // forms, green in every tag this repository carries, and arithmetically stale from
    // 0.31.0, when 5113 moved the 5xxx band and the two assertions that DO read the
    // registry were updated while this one was not. Same defect, same repair, as
    // `ConfigKey.test.ts`. It now reads the ACTUAL per-band counts and asserts the six
    // bands both partition the registry and account for all of it.
    it('the six bands partition the registry exactly', () => {
      const perBand = ([[1000, 1999], [2000, 2999], [3000, 3999],
                        [4000, 4999], [5000, 5999], [6000, 6999]] as [number, number][])
        .map(([lo, hi]) => byRange(lo, hi).length);

      expect(perBand).toEqual([15, 20, 21, 20, 35, 9]);
      expect(perBand.reduce((a, b) => a + b, 0)).toBe(allCodes.length);
    });
  });

  describe('v0.5.2 codes (spec v0.4.2 07-errors.md §3.2)', () => {
    it('should expose OFFLINE_PASS_REVOKED = 2014 with Error severity, non-recoverable', () => {
      expect(OsppErrorCode.OFFLINE_PASS_REVOKED).toBe(2014);
      const meta = OSPP_ERROR_REGISTRY[OsppErrorCode.OFFLINE_PASS_REVOKED];
      expect(meta.text).toBe('OFFLINE_PASS_REVOKED');
      expect(meta.severity).toBe('Error');
      expect(meta.recoverable).toBe(false);
      expect(meta.category).toBe('Auth');
    });

    it('should expose OFFLINE_ORG_MISMATCH = 2015 with Error severity, non-recoverable', () => {
      expect(OsppErrorCode.OFFLINE_ORG_MISMATCH).toBe(2015);
      const meta = OSPP_ERROR_REGISTRY[OsppErrorCode.OFFLINE_ORG_MISMATCH];
      expect(meta.text).toBe('OFFLINE_ORG_MISMATCH');
      expect(meta.severity).toBe('Error');
      expect(meta.recoverable).toBe(false);
      expect(meta.category).toBe('Auth');
    });

    it('should expose OFFLINE_USER_MISMATCH = 2016 with Error severity, non-recoverable', () => {
      expect(OsppErrorCode.OFFLINE_USER_MISMATCH).toBe(2016);
      const meta = OSPP_ERROR_REGISTRY[OsppErrorCode.OFFLINE_USER_MISMATCH];
      expect(meta.text).toBe('OFFLINE_USER_MISMATCH');
      expect(meta.severity).toBe('Error');
      expect(meta.recoverable).toBe(false);
      expect(meta.category).toBe('Auth');
    });

    it('should expose OFFLINE_RECEIPT_MISMATCH = 2017 with Critical severity, non-recoverable', () => {
      // spec 07-errors.md §3.2 elevates 2017 to Critical — receipt-body
      // tampering is a stronger integrity violation than the other gate fails.
      expect(OsppErrorCode.OFFLINE_RECEIPT_MISMATCH).toBe(2017);
      const meta = OSPP_ERROR_REGISTRY[OsppErrorCode.OFFLINE_RECEIPT_MISMATCH];
      expect(meta.text).toBe('OFFLINE_RECEIPT_MISMATCH');
      expect(meta.severity).toBe('Critical');
      expect(meta.recoverable).toBe(false);
      expect(meta.category).toBe('Auth');
    });

    it('has semantically-confirmed httpStatus aligned cross-SDK with ospp-sdk-php v0.5.2', () => {
      // Spec §2.4 does not normatively specify httpStatus for these 4 codes;
      // both SDKs converge on values chosen by RFC 9110 semantics:
      //
      //   2014 OFFLINE_PASS_REVOKED      → 401  (revoked credential ≡ credential
      //         no longer valid; RFC 9110 401 "credential invalid")
      //   2015 OFFLINE_ORG_MISMATCH      → 403  (pass valid but used cross-org;
      //         RFC 9110 403 "authenticated, not permitted for this resource")
      //   2016 OFFLINE_USER_MISMATCH     → 403  (pass valid but bound to a
      //         different user than the envelope claims; 403 — pass is fine,
      //         just not for this user; same shape as 2006 STATION_MISMATCH)
      //   2017 OFFLINE_RECEIPT_MISMATCH  → 422  (signature itself verified per
      //         spec §3.2 — NOT 401; the cross-check failure is "syntax correct,
      //         instructions inconsistent" ≡ RFC 9110 422 Unprocessable Entity)
      expect(OSPP_ERROR_REGISTRY[OsppErrorCode.OFFLINE_PASS_REVOKED].httpStatus).toBe(401);
      expect(OSPP_ERROR_REGISTRY[OsppErrorCode.OFFLINE_ORG_MISMATCH].httpStatus).toBe(403);
      expect(OSPP_ERROR_REGISTRY[OsppErrorCode.OFFLINE_USER_MISMATCH].httpStatus).toBe(403);
      expect(OSPP_ERROR_REGISTRY[OsppErrorCode.OFFLINE_RECEIPT_MISMATCH].httpStatus).toBe(422);
    });
  });

  describe('v0.6.2 code (spec 07-errors.md §3.2)', () => {
    it('should expose SERVER_AUTH_NONCE_MISMATCH = 2018 with Critical severity, non-recoverable', () => {
      // spec 07-errors.md:245 — BLE Partial-A ServerSignedAuth anti-replay
      // (signed appNonce != Hello.appNonce). Critical, recoverable=false.
      expect(OsppErrorCode.SERVER_AUTH_NONCE_MISMATCH).toBe(2018);
      const meta = OSPP_ERROR_REGISTRY[OsppErrorCode.SERVER_AUTH_NONCE_MISMATCH];
      expect(meta.text).toBe('SERVER_AUTH_NONCE_MISMATCH');
      expect(meta.severity).toBe('Critical');
      expect(meta.recoverable).toBe(false);
      expect(meta.category).toBe('Auth');
    });

    it('has httpStatus 401 aligned cross-SDK with ospp-sdk-php v0.6.2', () => {
      // 2018 → 401 (NOT 422 like 2017). The ServerSignedAuth replay is REJECTED
      // at the BLE handshake (station refuses + disconnects) — auth does NOT
      // succeed, unlike 2017 (auth succeeded, only a receipt cross-check failed).
      // Mirrors the 2005 counter-replay / JWT-rejection family.
      expect(OSPP_ERROR_REGISTRY[OsppErrorCode.SERVER_AUTH_NONCE_MISMATCH].httpStatus).toBe(401);
    });
  });
});

describe('OSPP_ERROR_REGISTRY', () => {
  const allCodes = Object.values(OsppErrorCode).filter(
    (v): v is number => typeof v === 'number',
  );

  it('should have an entry for every OsppErrorCode', () => {
    for (const code of allCodes) {
      const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
      expect(entry, `missing registry entry for code ${code}`).toBeDefined();
    }
  });

  it('should have code field matching the enum value', () => {
    for (const code of allCodes) {
      const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
      expect(entry.code).toBe(code);
    }
  });

  it('should have UPPER_SNAKE_CASE text matching the enum key', () => {
    const entries = Object.entries(OsppErrorCode).filter(
      ([, v]) => typeof v === 'number',
    ) as [string, number][];

    for (const [key, code] of entries) {
      const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
      expect(entry.text).toBe(key);
    }
  });

  it('should have valid severity values', () => {
    const validSeverities = ['Critical', 'Error', 'Warning', 'Info'];
    for (const code of allCodes) {
      const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
      expect(validSeverities).toContain(entry.severity);
    }
  });

  it('should have boolean recoverable', () => {
    for (const code of allCodes) {
      const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
      expect(typeof entry.recoverable).toBe('boolean');
    }
  });

  it('should have numeric httpStatus in valid HTTP range', () => {
    for (const code of allCodes) {
      const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
      expect(entry.httpStatus).toBeGreaterThanOrEqual(400);
      expect(entry.httpStatus).toBeLessThanOrEqual(599);
    }
  });

  it('should have valid category values', () => {
    const validCategories: OsppErrorCategory[] = [
      'Transport', 'Auth', 'Session', 'Payment', 'Hardware', 'Server', 'Vendor',
    ];
    for (const code of allCodes) {
      const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
      expect(validCategories).toContain(entry.category);
    }
  });

  describe('category-range consistency', () => {
    const categoryForRange: Record<string, OsppErrorCategory> = {
      '1': 'Transport',
      '2': 'Auth',
      '3': 'Session',
      '4': 'Payment',
      '5': 'Hardware',
      '6': 'Server',
    };

    it('should have category matching the code range', () => {
      for (const code of allCodes) {
        const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
        const rangeKey = String(code)[0];
        expect(entry.category, `code ${code} category mismatch`).toBe(
          categoryForRange[rangeKey],
        );
      }
    });
  });

  describe('spec §2.4 explicit HTTP status mappings', () => {
    // TRANSCRIBED IN FULL from the §2.4 table, not sampled from it.
    // 31 code-status pairs. Re-derived from the table rather than edited by hand:
    // v0.31.0 carried 31, v0.32.0 carried 30 with `2008 -> 401` removed, and
    // v0.42.0 carries 31 again with `3020 -> 409` added at SDK 0.39.0.
    //
    // The count and the closing clause both went stale at that addition: this
    // comment read "30 ... Nothing else in this list moved" while the array below
    // it held 31 entries, one of them `[3020, 409]`. The list is compared to the
    // registry by the assertion underneath; the SENTENCE was compared to nothing.
    //
    // This list had drifted eleven codes behind the table it claims to mirror --
    // 4010, 4017, 2019, 3003, 3019, 4015, 6008, 4016 and 4020 were all named there
    // and absent here -- which is how `3003` reached 0.31.0 with this SDK answering
    // 503 and ospp-sdk-php answering 500 while both suites stayed green.
    //
    // `2008` USED TO BE listed under BOTH 401 and 403 -- in all 49 spec tags from
    // v0.1.0-draft.1 to v0.31.0, the only one of this table's thirty codes to
    // appear twice. This note flagged that as an upstream duplicate the SDK should
    // not silently resolve. Spec 0.32.0 resolved it: §4.4's multi-status licence
    // gained a condition -- a code listed under two statuses MUST have a registry
    // entry naming the condition that selects between them -- and 2008's entry
    // names one, "the AUTHENTICATED entity does not have the required RBAC role or
    // permission", which is 403 by construction. The 401 row was UNSELECTABLE, not
    // merely redundant, and fell out as a consequence.
    //
    // The value here does not move, and that is the point worth keeping. 403 was
    // one of two conformant answers under the unconditional licence and is the only
    // one under the conditional one; the sibling ospp-sdk-php chose 401, was
    // equally conformant, and moves to 403. No code is listed twice at 0.32.0, so
    // the ambiguity this note existed to flag is gone.
    const specMappings: [number, number][] = [
      [1005, 400], [3015, 400], [4010, 400], [4017, 400], [6004, 400],
      [2009, 401], [2010, 401], [2019, 401],
      [4001, 402],
      [2008, 403],
      [3005, 404], [3006, 404], [3012, 404],
      [3001, 409], [3003, 409], [3014, 409], [3019, 409], [3020, 409], [4015, 409], [6005, 409], [6008, 409],
      [3004, 422], [3008, 422], [3010, 422], [4016, 422], [4020, 422],
      [6006, 429],
      [6000, 500], [6001, 500],
      [6003, 502],
      [6002, 504],
    ];

    for (const [code, expectedHttp] of specMappings) {
      it(`code ${code} should map to HTTP ${expectedHttp}`, () => {
        const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
        expect(entry.httpStatus).toBe(expectedHttp);
      });
    }
  });

  describe('spec-defined severity spot checks', () => {
    const checks: [number, string, boolean][] = [
      [1003, 'Critical', false],
      [1012, 'Critical', false],
      [2005, 'Critical', false],
      [5001, 'Critical', false],
      [5009, 'Critical', false],
      [4008, 'Critical', false],
      [6007, 'Info',     true],
      [3001, 'Warning',  true],
      [2003, 'Warning',  true],
    ];

    for (const [code, severity, recoverable] of checks) {
      it(`code ${code} should be ${severity}, recoverable=${recoverable}`, () => {
        const entry = OSPP_ERROR_REGISTRY[code as OsppErrorCode];
        expect(entry.severity).toBe(severity);
        expect(entry.recoverable).toBe(recoverable);
      });
    }
  });
});
