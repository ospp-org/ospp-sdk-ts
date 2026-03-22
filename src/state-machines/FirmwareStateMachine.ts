/**
 * Firmware Update State Machine — 10 states, governs OTA update process.
 *
 * Source: spec/05-state-machines.md §5.
 * Initial state: Idle.
 * Terminal state: Activated.
 * Failed always transitions back to Idle (rollback complete).
 */

export type FirmwareState =
  | 'Idle'
  | 'Downloading'
  | 'Downloaded'
  | 'Verifying'
  | 'Verified'
  | 'Installing'
  | 'Installed'
  | 'Rebooting'
  | 'Activated'
  | 'Failed';

const TRANSITIONS: ReadonlyMap<FirmwareState, ReadonlySet<FirmwareState>> = new Map([
  ['Idle',        new Set<FirmwareState>(['Downloading'])],
  ['Downloading', new Set<FirmwareState>(['Downloaded', 'Failed'])],
  ['Downloaded',  new Set<FirmwareState>(['Verifying'])],
  ['Verifying',   new Set<FirmwareState>(['Verified', 'Failed'])],
  ['Verified',    new Set<FirmwareState>(['Installing'])],
  ['Installing',  new Set<FirmwareState>(['Installed', 'Failed'])],
  ['Installed',   new Set<FirmwareState>(['Rebooting'])],
  ['Rebooting',   new Set<FirmwareState>(['Activated', 'Failed'])],
  ['Failed',      new Set<FirmwareState>(['Idle'])],
  // Activated is terminal — no outgoing transitions.
]);

export function canTransition(from: FirmwareState, to: FirmwareState): boolean {
  return TRANSITIONS.get(from)?.has(to) ?? false;
}

export class FirmwareStateMachine {
  private _state: FirmwareState;

  constructor(initialState: FirmwareState = 'Idle') {
    this._state = initialState;
  }

  get state(): FirmwareState {
    return this._state;
  }

  canTransitionTo(to: FirmwareState): boolean {
    return canTransition(this._state, to);
  }

  transition(to: FirmwareState): void {
    if (!this.canTransitionTo(to)) {
      throw new Error(`Invalid firmware transition: ${this._state} → ${to}`);
    }
    this._state = to;
  }
}

export { TRANSITIONS as FIRMWARE_TRANSITIONS };
