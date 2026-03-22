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

  it('should have exactly 102 error codes', () => {
    expect(allCodes).toHaveLength(102);
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

    it('should have 14 auth errors (2xxx)', () => {
      expect(byRange(2000, 2999)).toHaveLength(14);
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

    it('15 + 14 + 17 + 14 + 34 + 8 = 102', () => {
      expect(15 + 14 + 17 + 14 + 34 + 8).toBe(102);
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
