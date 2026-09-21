import { describe, it, expect } from 'vitest';
import {
  ReservationStateMachine,
  canTransition,
  isTerminal,
  RESERVATION_TRANSITIONS,
  type ReservationState,
} from '../../src/state-machines/ReservationStateMachine';

const ALL: ReservationState[] = ['Pending', 'Confirmed', 'Active', 'Expired', 'Cancelled'];

describe('canTransition — valid', () => {
  const valid: [ReservationState, ReservationState][] = [
    ['Pending', 'Confirmed'], ['Pending', 'Cancelled'],
    ['Confirmed', 'Active'], ['Confirmed', 'Expired'], ['Confirmed', 'Cancelled'],
  ];

  for (const [from, to] of valid) {
    it(`${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }

  // WAS `expect(valid).toHaveLength(5)` — the transcription above compared to its
  // own length, which no change to `ReservationStateMachine.ts` could move. The
  // sibling defect in `SessionStateMachine.test.ts` at least imported the table
  // it failed to read; this file did not import it at all.
  //
  // The count is now derived from the machine's own table, and the transcription
  // is compared to it set-wise.
  it('declares exactly the 5 transitions transcribed above', () => {
    const declared = [...RESERVATION_TRANSITIONS].flatMap(([from, tos]) =>
      [...tos].map((to) => `${from} -> ${to}`),
    );
    const transcribed = valid.map(([from, to]) => `${from} -> ${to}`);

    expect(declared.slice().sort()).toEqual(transcribed.slice().sort());
    expect(declared).toHaveLength(5);
  });
});

describe('canTransition — invalid', () => {
  const invalid: [ReservationState, ReservationState][] = [
    ['Pending', 'Active'], ['Pending', 'Expired'], ['Pending', 'Pending'],
    ['Confirmed', 'Confirmed'], ['Confirmed', 'Pending'],
    ['Active', 'Pending'], ['Active', 'Confirmed'], ['Active', 'Active'],
    ['Expired', 'Pending'], ['Expired', 'Confirmed'], ['Expired', 'Expired'],
    ['Cancelled', 'Pending'], ['Cancelled', 'Confirmed'], ['Cancelled', 'Cancelled'],
  ];

  for (const [from, to] of invalid) {
    it(`${from} → ${to} should be rejected`, () => {
      expect(canTransition(from, to)).toBe(false);
    });
  }
});

describe('isTerminal', () => {
  it('Active is terminal', () => expect(isTerminal('Active')).toBe(true));
  it('Expired is terminal', () => expect(isTerminal('Expired')).toBe(true));
  it('Cancelled is terminal', () => expect(isTerminal('Cancelled')).toBe(true));
  it('Pending is not terminal', () => expect(isTerminal('Pending')).toBe(false));
  it('Confirmed is not terminal', () => expect(isTerminal('Confirmed')).toBe(false));
});

describe('ReservationStateMachine class', () => {
  it('should start in Pending by default', () => {
    expect(new ReservationStateMachine().state).toBe('Pending');
  });

  it('should complete happy path: Pending → Confirmed → Active', () => {
    const sm = new ReservationStateMachine();
    sm.transition('Confirmed');
    sm.transition('Active');
    expect(sm.state).toBe('Active');
    expect(sm.isTerminal).toBe(true);
  });

  it('should handle expiry: Confirmed → Expired', () => {
    const sm = new ReservationStateMachine('Confirmed');
    sm.transition('Expired');
    expect(sm.state).toBe('Expired');
  });

  it('should handle cancellation from Pending', () => {
    const sm = new ReservationStateMachine();
    sm.transition('Cancelled');
    expect(sm.state).toBe('Cancelled');
  });

  it('should handle cancellation from Confirmed', () => {
    const sm = new ReservationStateMachine('Confirmed');
    sm.transition('Cancelled');
    expect(sm.state).toBe('Cancelled');
  });

  it('should throw on transition from terminal', () => {
    const sm = new ReservationStateMachine('Active');
    expect(() => sm.transition('Confirmed')).toThrow('Invalid reservation transition');
  });
});
