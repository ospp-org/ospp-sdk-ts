/**
 * Session State Machine — 6 states, governs session lifecycle.
 *
 * Source: spec/05-state-machines.md §2.
 * Initial state: Pending (session initiated).
 * Terminal states: Completed, Failed.
 */

export type SessionState = 'Pending' | 'Authorized' | 'Active' | 'Stopping' | 'Completed' | 'Failed';

const TRANSITIONS: ReadonlyMap<SessionState, ReadonlySet<SessionState>> = new Map([
  ['Pending',    new Set<SessionState>(['Authorized', 'Failed'])],
  ['Authorized', new Set<SessionState>(['Active', 'Failed'])],
  ['Active',     new Set<SessionState>(['Stopping', 'Failed'])],
  ['Stopping',   new Set<SessionState>(['Completed', 'Failed'])],
  // Completed and Failed are terminal — no outgoing transitions.
]);

export function canTransition(from: SessionState, to: SessionState): boolean {
  return TRANSITIONS.get(from)?.has(to) ?? false;
}

export function isTerminal(state: SessionState): boolean {
  return state === 'Completed' || state === 'Failed';
}

export class SessionStateMachine {
  private _state: SessionState;

  constructor(initialState: SessionState = 'Pending') {
    this._state = initialState;
  }

  get state(): SessionState {
    return this._state;
  }

  get isTerminal(): boolean {
    return isTerminal(this._state);
  }

  canTransitionTo(to: SessionState): boolean {
    return canTransition(this._state, to);
  }

  transition(to: SessionState): void {
    if (!this.canTransitionTo(to)) {
      throw new Error(`Invalid session transition: ${this._state} → ${to}`);
    }
    this._state = to;
  }
}

export { TRANSITIONS as SESSION_TRANSITIONS };
