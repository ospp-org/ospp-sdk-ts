import { describe, it, expect } from 'vitest';
import { BayStatus } from '../../src/enums/BayStatus';

describe('BayStatus', () => {
  it('should have exactly 7 states', () => {
    expect(Object.values(BayStatus)).toHaveLength(7);
  });

  it('should have unique PascalCase string values', () => {
    const values = Object.values(BayStatus);
    expect(new Set(values).size).toBe(values.length);

    for (const value of values) {
      expect(value).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  it('should contain exactly the spec-defined values', () => {
    const expected = [
      'Available',
      'Reserved',
      'Occupied',
      'Finishing',
      'Faulted',
      'Unavailable',
      'Unknown',
    ];
    expect(Object.values(BayStatus).sort()).toEqual([...expected].sort());
  });

  describe('state semantics from spec §1.2', () => {
    it('Unknown is the initial state after power-on', () => {
      expect(BayStatus.UNKNOWN).toBe('Unknown');
    });

    it('Available means ready for session or reservation', () => {
      expect(BayStatus.AVAILABLE).toBe('Available');
    });

    it('Faulted blocks StartService and ReserveBay', () => {
      expect(BayStatus.FAULTED).toBe('Faulted');
    });

    it('Finishing is the post-session wind-down state', () => {
      expect(BayStatus.FINISHING).toBe('Finishing');
    });
  });
});
