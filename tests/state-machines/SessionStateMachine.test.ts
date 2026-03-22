import { describe, it, expect } from 'vitest';
import {
  SessionStateMachine,
  canTransition,
  isTerminal,
  SESSION_TRANSITIONS,
  type SessionState,
} from '../../src/state-machines/SessionStateMachine';

const ALL: SessionState[] = ['Pending', 'Authorized', 'Active', 'Stopping', 'Completed', 'Failed'];

describe('canTransition — valid', () => {
  const valid: [SessionState, SessionState][] = [
    ['Pending', 'Authorized'], ['Pending', 'Failed'],
    ['Authorized', 'Active'], ['Authorized', 'Failed'],
    ['Active', 'Stopping'], ['Active', 'Failed'],
    ['Stopping', 'Completed'], ['Stopping', 'Failed'],
  ];

  for (const [from, to] of valid) {
    it(`${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }

  it('should have 8 valid transitions total', () => {
    expect(valid).toHaveLength(8);
  });
});

describe('canTransition — invalid', () => {
  const invalid: [SessionState, SessionState][] = [
    ['Pending', 'Active'], ['Pending', 'Stopping'], ['Pending', 'Completed'], ['Pending', 'Pending'],
    ['Authorized', 'Authorized'], ['Authorized', 'Stopping'], ['Authorized', 'Completed'], ['Authorized', 'Pending'],
    ['Active', 'Active'], ['Active', 'Authorized'], ['Active', 'Completed'], ['Active', 'Pending'],
    ['Stopping', 'Stopping'], ['Stopping', 'Active'], ['Stopping', 'Authorized'], ['Stopping', 'Pending'],
    // Terminal states have no outgoing transitions
    ['Completed', 'Pending'], ['Completed', 'Failed'], ['Completed', 'Completed'],
    ['Failed', 'Pending'], ['Failed', 'Completed'], ['Failed', 'Failed'],
  ];

  for (const [from, to] of invalid) {
    it(`${from} → ${to} should be rejected`, () => {
      expect(canTransition(from, to)).toBe(false);
    });
  }
});

describe('isTerminal', () => {
  it('Completed is terminal', () => expect(isTerminal('Completed')).toBe(true));
  it('Failed is terminal', () => expect(isTerminal('Failed')).toBe(true));
  it('Pending is not terminal', () => expect(isTerminal('Pending')).toBe(false));
  it('Active is not terminal', () => expect(isTerminal('Active')).toBe(false));
});

describe('SessionStateMachine class', () => {
  it('should start in Pending by default', () => {
    expect(new SessionStateMachine().state).toBe('Pending');
  });

  it('should complete the happy path', () => {
    const sm = new SessionStateMachine();
    sm.transition('Authorized');
    sm.transition('Active');
    sm.transition('Stopping');
    sm.transition('Completed');
    expect(sm.state).toBe('Completed');
    expect(sm.isTerminal).toBe(true);
  });

  it('should fail from any non-terminal state', () => {
    for (const s of ['Pending', 'Authorized', 'Active', 'Stopping'] as SessionState[]) {
      const sm = new SessionStateMachine(s);
      sm.transition('Failed');
      expect(sm.state).toBe('Failed');
      expect(sm.isTerminal).toBe(true);
    }
  });

  it('should throw on transition from terminal state', () => {
    const sm = new SessionStateMachine('Completed');
    expect(() => sm.transition('Pending')).toThrow('Invalid session transition');
  });

  it('should throw on skip (Pending → Active)', () => {
    const sm = new SessionStateMachine();
    expect(() => sm.transition('Active')).toThrow('Invalid session transition: Pending → Active');
  });
});
