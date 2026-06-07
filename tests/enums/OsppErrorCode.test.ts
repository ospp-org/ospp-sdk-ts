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

  it('should have exactly 106 error codes', () => {
    // v0.5.2: spec v0.4.2 07-errors.md §3.2 added 2014-2017 (4 codes).
    // Total 102 → 106.
    expect(allCodes).toHaveLength(106);
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

    it('should have 18 auth errors (2xxx)', () => {
      // v0.5.2: 14 → 18 (2014/2015/2016/2017).
      expect(byRange(2000, 2999)).toHaveLength(18);
    });

    it('should have 17 session/bay errors (3xxx)', () => {
      expect(byRange(3000, 3999)).toHaveLength(17);
    });

    it('should have 14 payment/credit errors (4xxx)', () => {
      expect(byRange(4000, 4999)).toHaveLength(14);
    });

    it('should have 34 hardware/software errors (5xxx)', () => {
      expect(byRange(5000, 5999)).toHaveLength(34);
    });

    it('should have 8 server errors (6xxx)', () => {
      expect(byRange(6000, 6999)).toHaveLength(8);
    });

    it('15 + 18 + 17 + 14 + 34 + 8 = 106', () => {
      expect(15 + 18 + 17 + 14 + 34 + 8).toBe(106);
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
    const specMappings: [number, number][] = [
      [1005, 400], [3015, 400], [6004, 400],
      [2009, 401], [2010, 401],
      [4001, 402],
      [2008, 403],
      [3005, 404], [3006, 404], [3012, 404],
      [3001, 409], [3014, 409], [6005, 409],
      [3004, 422], [3008, 422], [3010, 422],
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
