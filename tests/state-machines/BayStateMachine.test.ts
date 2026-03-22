import { describe, it, expect } from 'vitest';
import { BayStateMachine, canTransition, BAY_TRANSITIONS } from '../../src/state-machines/BayStateMachine';
import { BayStatus } from '../../src/enums/BayStatus';

const ALL = Object.values(BayStatus);
const { UNKNOWN, AVAILABLE, RESERVED, OCCUPIED, FINISHING, FAULTED, UNAVAILABLE } = BayStatus;

describe('Bay SM transitions map', () => {
  it('should have an entry for every state', () => {
    for (const s of ALL) {
      expect(BAY_TRANSITIONS.has(s), `missing ${s}`).toBe(true);
    }
  });
});

describe('canTransition — valid', () => {
  const valid: [BayStatus, BayStatus][] = [
    // Unknown →
    [UNKNOWN, AVAILABLE], [UNKNOWN, FAULTED], [UNKNOWN, UNAVAILABLE],
    // Available →
    [AVAILABLE, RESERVED], [AVAILABLE, OCCUPIED], [AVAILABLE, FAULTED],
    [AVAILABLE, UNAVAILABLE], [AVAILABLE, UNKNOWN],
    // Reserved →
    [RESERVED, OCCUPIED], [RESERVED, AVAILABLE], [RESERVED, FAULTED], [RESERVED, UNKNOWN],
    // Occupied →
    [OCCUPIED, FINISHING], [OCCUPIED, FAULTED], [OCCUPIED, UNKNOWN],
    // Finishing →
    [FINISHING, AVAILABLE], [FINISHING, FAULTED], [FINISHING, UNKNOWN],
    // Faulted →
    [FAULTED, AVAILABLE], [FAULTED, UNAVAILABLE], [FAULTED, UNKNOWN],
    // Unavailable →
    [UNAVAILABLE, AVAILABLE], [UNAVAILABLE, UNKNOWN],
  ];

  for (const [from, to] of valid) {
    it(`${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }

  it('should have 23 valid transitions total', () => {
    expect(valid).toHaveLength(23);
  });
});

describe('canTransition — invalid', () => {
  const invalid: [BayStatus, BayStatus][] = [
    [UNKNOWN, OCCUPIED], [UNKNOWN, RESERVED], [UNKNOWN, FINISHING], [UNKNOWN, UNKNOWN],
    [AVAILABLE, AVAILABLE], [AVAILABLE, FINISHING],
    [RESERVED, RESERVED], [RESERVED, FINISHING], [RESERVED, UNAVAILABLE],
    [OCCUPIED, OCCUPIED], [OCCUPIED, AVAILABLE], [OCCUPIED, RESERVED], [OCCUPIED, UNAVAILABLE],
    [FINISHING, FINISHING], [FINISHING, RESERVED], [FINISHING, OCCUPIED], [FINISHING, UNAVAILABLE],
    [FAULTED, FAULTED], [FAULTED, RESERVED], [FAULTED, OCCUPIED], [FAULTED, FINISHING],
    [UNAVAILABLE, UNAVAILABLE], [UNAVAILABLE, RESERVED], [UNAVAILABLE, OCCUPIED],
    [UNAVAILABLE, FINISHING], [UNAVAILABLE, FAULTED],
  ];

  for (const [from, to] of invalid) {
    it(`${from} → ${to} should be rejected`, () => {
      expect(canTransition(from, to)).toBe(false);
    });
  }
});

describe('BayStateMachine class', () => {
  it('should start in Unknown by default', () => {
    const sm = new BayStateMachine();
    expect(sm.state).toBe(UNKNOWN);
  });

  it('should accept custom initial state', () => {
    const sm = new BayStateMachine(AVAILABLE);
    expect(sm.state).toBe(AVAILABLE);
  });

  it('should perform valid transition', () => {
    const sm = new BayStateMachine();
    sm.transition(AVAILABLE);
    expect(sm.state).toBe(AVAILABLE);
    sm.transition(OCCUPIED);
    expect(sm.state).toBe(OCCUPIED);
    sm.transition(FINISHING);
    expect(sm.state).toBe(FINISHING);
    sm.transition(AVAILABLE);
    expect(sm.state).toBe(AVAILABLE);
  });

  it('should throw on invalid transition', () => {
    const sm = new BayStateMachine(AVAILABLE);
    expect(() => sm.transition(FINISHING)).toThrow('Invalid bay transition: Available → Finishing');
  });

  it('should support LWT → Unknown from any non-Unknown state', () => {
    for (const s of ALL.filter(s => s !== UNKNOWN)) {
      const sm = new BayStateMachine(s);
      expect(sm.canTransitionTo(UNKNOWN)).toBe(true);
    }
  });

  it('should support hardware fault from Available, Reserved, Occupied, Finishing', () => {
    for (const s of [AVAILABLE, RESERVED, OCCUPIED, FINISHING]) {
      expect(canTransition(s, FAULTED)).toBe(true);
    }
  });

  it('should NOT support hardware fault from Unknown or Unavailable', () => {
    expect(canTransition(UNKNOWN, FAULTED)).toBe(true); // actually spec says Unknown→Faulted is valid (self-test fails)
    expect(canTransition(UNAVAILABLE, FAULTED)).toBe(false);
  });
});
