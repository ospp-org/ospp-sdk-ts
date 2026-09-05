/**
 * Session State Machine — 6 states, governs session lifecycle.
 *
 * Source: spec/05-state-machines.md §3.
 * Initial state: Pending (session initiated).
 * Terminal states: Completed, Failed.
 */

export type SessionState = 'Pending' | 'Authorized' | 'Active' | 'Stopping' | 'Completed' | 'Failed';

const TRANSITIONS: ReadonlyMap<SessionState, ReadonlySet<SessionState>> = new Map([
  ['Pending',    new Set<SessionState>(['Authorized', 'Failed'])],
  ['Authorized', new Set<SessionState>(['Active', 'Failed'])],
  // `Active -> Completed` is the AUTONOMOUS stop, and it was missing here until 0.32.0.
  // 05-state-machines.md §3.3 asserts it in four places for three reasons the station
  // reports without ever being asked to stop -- `Local` (the user pressed the physical
  // Stop button on the bay), `LocalOutOfCredit`, `OperatorStopped` -- and the §3.1 diagram
  // draws the edge. Without it, three of the seven SessionEndReason values were
  // unrepresentable here.
  //
  // `Stopping` is NOT a legal substitute: it means the server sent StopService and awaits
  // confirmation. The reference server reached the right end state by writing it anyway,
  // in a separate un-wrapped write, and its own sweep reads a persisted `Stopping` as
  // "the station never confirmed the stop" and settles it on a different billing arm.
  ['Active',     new Set<SessionState>(['Stopping', 'Completed', 'Failed'])],
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
