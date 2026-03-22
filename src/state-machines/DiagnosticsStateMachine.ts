/**
 * Diagnostics State Machine — 5 states, governs diagnostics collection/upload.
 *
 * Source: implied from DiagnosticsNotification status values
 *         (spec/schemas/mqtt/diagnostics-notification.schema.json)
 *         and spec/03-messages.md §6.6–6.7.
 *
 * Initial state: Idle.
 * Uploaded and Failed transition back to Idle (ready for next request).
 */

export type DiagnosticsState = 'Idle' | 'Collecting' | 'Uploading' | 'Uploaded' | 'Failed';

const TRANSITIONS: ReadonlyMap<DiagnosticsState, ReadonlySet<DiagnosticsState>> = new Map([
  ['Idle',       new Set<DiagnosticsState>(['Collecting'])],
  ['Collecting', new Set<DiagnosticsState>(['Uploading', 'Failed'])],
  ['Uploading',  new Set<DiagnosticsState>(['Uploaded', 'Failed'])],
  ['Uploaded',   new Set<DiagnosticsState>(['Idle'])],
  ['Failed',     new Set<DiagnosticsState>(['Idle'])],
]);

export function canTransition(from: DiagnosticsState, to: DiagnosticsState): boolean {
  return TRANSITIONS.get(from)?.has(to) ?? false;
}

export class DiagnosticsStateMachine {
  private _state: DiagnosticsState;

  constructor(initialState: DiagnosticsState = 'Idle') {
    this._state = initialState;
  }

  get state(): DiagnosticsState {
    return this._state;
  }

  canTransitionTo(to: DiagnosticsState): boolean {
    return canTransition(this._state, to);
  }

  transition(to: DiagnosticsState): void {
    if (!this.canTransitionTo(to)) {
      throw new Error(`Invalid diagnostics transition: ${this._state} → ${to}`);
    }
    this._state = to;
  }
}

export { TRANSITIONS as DIAGNOSTICS_TRANSITIONS };
