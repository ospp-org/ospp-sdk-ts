/**
 * Unit cover for BayStateMachine. The exhaustive 7x7 proof of the canonical
 * table lives in ./BayCanonicalTable.test.ts; this file covers the accessors and
 * the class wrapper.
 */

import { describe, it, expect } from 'vitest';
import {
  BayStateMachine,
  canTransition,
  allowedTransitions,
  transitionCount,
  BAY_STATION_TRANSITIONS,
  BAY_SERVER_TRANSITIONS,
} from '../../src/state-machines/BayStateMachine';
import { BayStatus } from '../../src/enums/BayStatus';
import { EffectedBy } from '../../src/enums/EffectedBy';

const ALL = Object.values(BayStatus);
const { UNKNOWN, AVAILABLE, RESERVED, OCCUPIED, FINISHING, FAULTED, UNAVAILABLE } = BayStatus;

describe('Bay SM transitions map', () => {
  it('should have an entry for every state in the Station table', () => {
    for (const s of ALL) {
      expect(BAY_STATION_TRANSITIONS.has(s), `missing ${s}`).toBe(true);
    }
  });

  it('has a Server table of exactly the six non-Unknown sources', () => {
    expect([...BAY_SERVER_TRANSITIONS.keys()].sort()).toEqual(
      ALL.filter((s) => s !== UNKNOWN).sort(),
    );
    for (const targets of BAY_SERVER_TRANSITIONS.values()) {
      expect([...targets]).toEqual([UNKNOWN]);
    }
  });
});

describe('transition counts', () => {
  it('is twenty-one for a station and twenty-seven for a server', () => {
    // spec/05-state-machines.md §2.3: "Twenty `Station` rows by distinct
    // `(from, to)` pair, and six `Server` rows — twenty-six in all."
    expect(transitionCount(EffectedBy.STATION)).toBe(21);
    expect(transitionCount(EffectedBy.SERVER)).toBe(27);
  });
});

describe('canTransition — valid Station rows', () => {
  const valid: [BayStatus, BayStatus][] = [
    // Unknown → five exits. `Occupied` and `Finishing` are the two the bay-FSM
    // arc added, for a station that rebooted mid-session and owes a truthful
    // post-boot report (spec 05-state-machines.md §2.3).
    [UNKNOWN, AVAILABLE], [UNKNOWN, FAULTED], [UNKNOWN, UNAVAILABLE],
    [UNKNOWN, OCCUPIED], [UNKNOWN, FINISHING], [UNKNOWN, RESERVED],
    // Available →
    [AVAILABLE, RESERVED], [AVAILABLE, OCCUPIED], [AVAILABLE, FAULTED], [AVAILABLE, UNAVAILABLE],
    // Reserved →
    [RESERVED, OCCUPIED], [RESERVED, AVAILABLE], [RESERVED, FAULTED],
    // Occupied →
    [OCCUPIED, FINISHING], [OCCUPIED, FAULTED],
    // Finishing →
    [FINISHING, AVAILABLE], [FINISHING, FAULTED],
    // Faulted →
    [FAULTED, AVAILABLE], [FAULTED, UNAVAILABLE],
    // Unavailable →
    [UNAVAILABLE, AVAILABLE], [UNAVAILABLE, FAULTED],
  ];

  for (const [from, to] of valid) {
    it(`${from} → ${to}`, () => {
      expect(canTransition(from, to, EffectedBy.STATION)).toBe(true);
    });
  }

  it('should have 21 valid Station transitions total', () => {
    expect(valid).toHaveLength(21);
  });
});

describe('canTransition — invalid for both parties', () => {
  const invalid: [BayStatus, BayStatus][] = [
    [UNKNOWN, UNKNOWN],
    [AVAILABLE, AVAILABLE], [AVAILABLE, FINISHING],
    [RESERVED, RESERVED], [RESERVED, FINISHING], [RESERVED, UNAVAILABLE],
    [OCCUPIED, OCCUPIED], [OCCUPIED, AVAILABLE], [OCCUPIED, RESERVED], [OCCUPIED, UNAVAILABLE],
    [FINISHING, FINISHING], [FINISHING, RESERVED], [FINISHING, OCCUPIED], [FINISHING, UNAVAILABLE],
    [FAULTED, FAULTED], [FAULTED, RESERVED], [FAULTED, OCCUPIED], [FAULTED, FINISHING],
    [UNAVAILABLE, UNAVAILABLE], [UNAVAILABLE, RESERVED], [UNAVAILABLE, OCCUPIED],
    [UNAVAILABLE, FINISHING],
  ];

  for (const [from, to] of invalid) {
    it(`${from} → ${to} should be rejected for both parties`, () => {
      expect(canTransition(from, to, EffectedBy.STATION)).toBe(false);
      expect(canTransition(from, to, EffectedBy.SERVER)).toBe(false);
    });
  }
});

describe('the Server rows are server-only', () => {
  // "No message carries this transition and the station does not perform it."
  for (const from of ALL.filter((s) => s !== UNKNOWN)) {
    it(`${from} → Unknown is inferred by a server and forbidden to a station`, () => {
      expect(canTransition(from, UNKNOWN, EffectedBy.STATION)).toBe(false);
      expect(canTransition(from, UNKNOWN, EffectedBy.SERVER)).toBe(true);
    });
  }
});

describe('allowedTransitions', () => {
  it('returns the Station targets for each state', () => {
    const expectations: [BayStatus, BayStatus[]][] = [
      [UNKNOWN, [AVAILABLE, FAULTED, UNAVAILABLE, OCCUPIED, FINISHING, RESERVED]],
      [AVAILABLE, [RESERVED, OCCUPIED, FAULTED, UNAVAILABLE]],
      [RESERVED, [OCCUPIED, AVAILABLE, FAULTED]],
      [OCCUPIED, [FINISHING, FAULTED]],
      [FINISHING, [AVAILABLE, FAULTED]],
      [FAULTED, [AVAILABLE, UNAVAILABLE]],
      [UNAVAILABLE, [AVAILABLE, FAULTED]],
    ];

    for (const [from, expected] of expectations) {
      expect(allowedTransitions(from, EffectedBy.STATION), `from ${from}`).toEqual(expected);
    }
  });
});

describe('BayStateMachine class', () => {
  it('should start in Unknown by default', () => {
    const sm = new BayStateMachine(EffectedBy.STATION);
    expect(sm.state).toBe(UNKNOWN);
    expect(sm.effectedBy).toBe(EffectedBy.STATION);
  });

  it('should accept custom initial state', () => {
    const sm = new BayStateMachine(EffectedBy.STATION, AVAILABLE);
    expect(sm.state).toBe(AVAILABLE);
  });

  it('should perform valid transition', () => {
    const sm = new BayStateMachine(EffectedBy.STATION);
    sm.transition(AVAILABLE);
    expect(sm.state).toBe(AVAILABLE);
    sm.transition(OCCUPIED);
    expect(sm.state).toBe(OCCUPIED);
    sm.transition(FINISHING);
    expect(sm.state).toBe(FINISHING);
    sm.transition(AVAILABLE);
    expect(sm.state).toBe(AVAILABLE);
  });

  it('resumes a session across a reboot: Unknown → Occupied → Finishing', () => {
    const sm = new BayStateMachine(EffectedBy.STATION);
    sm.transition(OCCUPIED);
    expect(sm.state).toBe(OCCUPIED);
    sm.transition(FINISHING);
    expect(sm.state).toBe(FINISHING);
  });

  it('should throw on invalid transition', () => {
    const sm = new BayStateMachine(EffectedBy.STATION, AVAILABLE);
    expect(() => sm.transition(FINISHING)).toThrow(
      'Invalid bay transition for Station: Available → Finishing',
    );
  });

  it('refuses a station machine the LWT → Unknown inference', () => {
    for (const s of ALL.filter((s) => s !== UNKNOWN)) {
      const sm = new BayStateMachine(EffectedBy.STATION, s);
      expect(sm.canTransitionTo(UNKNOWN)).toBe(false);
    }
  });

  it('should support LWT → Unknown from any non-Unknown state, for a server', () => {
    for (const s of ALL.filter((s) => s !== UNKNOWN)) {
      const sm = new BayStateMachine(EffectedBy.SERVER, s);
      expect(sm.canTransitionTo(UNKNOWN)).toBe(true);
    }
  });

  it('supports a hardware fault from every state that can hold one', () => {
    // §2.3, Hardware error detected: Available, Reserved, Occupied, Finishing,
    // Unavailable. Plus Unknown, where the fault is a failed self-test.
    for (const s of [AVAILABLE, RESERVED, OCCUPIED, FINISHING, UNAVAILABLE, UNKNOWN]) {
      expect(canTransition(s, FAULTED, EffectedBy.STATION), `${s} → Faulted`).toBe(true);
    }
  });

  it('supports a fault reported from Unavailable', () => {
    // Was pinned FALSE here before this arc, following the superseded chapter
    // copy. §2.3: "a bay taken out of service can still develop a fault, and a
    // technician working on it is the most likely person to find one.
    // Forbidding the transition would not prevent the fault, only the report of it."
    expect(canTransition(UNAVAILABLE, FAULTED, EffectedBy.STATION)).toBe(true);
  });
});
