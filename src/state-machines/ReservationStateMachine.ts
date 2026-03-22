/**
 * Reservation State Machine — 5 states, governs bay reservation lifecycle.
 *
 * Source: spec/05-state-machines.md §3.
 * Initial state: Pending (ReserveBay sent).
 * Terminal states: Active, Expired, Cancelled.
 */

export type ReservationState = 'Pending' | 'Confirmed' | 'Active' | 'Expired' | 'Cancelled';

const TRANSITIONS: ReadonlyMap<ReservationState, ReadonlySet<ReservationState>> = new Map([
  ['Pending',   new Set<ReservationState>(['Confirmed', 'Cancelled'])],
  ['Confirmed', new Set<ReservationState>(['Active', 'Expired', 'Cancelled'])],
  // Active, Expired, Cancelled are terminal — no outgoing transitions.
]);

export function canTransition(from: ReservationState, to: ReservationState): boolean {
  return TRANSITIONS.get(from)?.has(to) ?? false;
}

export function isTerminal(state: ReservationState): boolean {
  return state === 'Active' || state === 'Expired' || state === 'Cancelled';
}

export class ReservationStateMachine {
  private _state: ReservationState;

  constructor(initialState: ReservationState = 'Pending') {
    this._state = initialState;
  }

  get state(): ReservationState {
    return this._state;
  }

  get isTerminal(): boolean {
    return isTerminal(this._state);
  }

  canTransitionTo(to: ReservationState): boolean {
    return canTransition(this._state, to);
  }

  transition(to: ReservationState): void {
    if (!this.canTransitionTo(to)) {
      throw new Error(`Invalid reservation transition: ${this._state} → ${to}`);
    }
    this._state = to;
  }
}

export { TRANSITIONS as RESERVATION_TRANSITIONS };
