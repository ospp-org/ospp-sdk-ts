/**
 * Bay State Machine — 7 states, governs bay operational status.
 *
 * Source: spec/05-state-machines.md §1.
 * Initial state: Unknown (power-on / reboot).
 * Any transition not listed is invalid and MUST be rejected.
 */

import { BayStatus } from '../enums/BayStatus';

const { UNKNOWN, AVAILABLE, RESERVED, OCCUPIED, FINISHING, FAULTED, UNAVAILABLE } = BayStatus;

/** Valid transitions: from → Set<to>. */
const TRANSITIONS: ReadonlyMap<BayStatus, ReadonlySet<BayStatus>> = new Map<BayStatus, Set<BayStatus>>([
  [UNKNOWN,     new Set([AVAILABLE, FAULTED, UNAVAILABLE])],
  [AVAILABLE,   new Set([RESERVED, OCCUPIED, FAULTED, UNAVAILABLE, UNKNOWN])],
  [RESERVED,    new Set([OCCUPIED, AVAILABLE, FAULTED, UNKNOWN])],
  [OCCUPIED,    new Set([FINISHING, FAULTED, UNKNOWN])],
  [FINISHING,   new Set([AVAILABLE, FAULTED, UNKNOWN])],
  [FAULTED,     new Set([AVAILABLE, UNAVAILABLE, UNKNOWN])],
  [UNAVAILABLE, new Set([AVAILABLE, UNKNOWN])],
]);

export function canTransition(from: BayStatus, to: BayStatus): boolean {
  return TRANSITIONS.get(from)?.has(to) ?? false;
}

export class BayStateMachine {
  private _state: BayStatus;

  constructor(initialState: BayStatus = BayStatus.UNKNOWN) {
    this._state = initialState;
  }

  get state(): BayStatus {
    return this._state;
  }

  canTransitionTo(to: BayStatus): boolean {
    return canTransition(this._state, to);
  }

  transition(to: BayStatus): void {
    if (!this.canTransitionTo(to)) {
      throw new Error(`Invalid bay transition: ${this._state} → ${to}`);
    }
    this._state = to;
  }
}

export { TRANSITIONS as BAY_TRANSITIONS };
