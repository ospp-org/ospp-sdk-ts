/**
 * Station State Machine — 6 states, the OUTERMOST machine.
 *
 * Source: spec/05-state-machines.md §1.
 *
 * The chapter previously defined machines for bays, sessions, reservations, BLE
 * and firmware and none for the station, so `Pending`, `Rejected`, `Accepted`
 * and not-provisioned had no formal home, and `3018 TOPOLOGY_MISMATCH` depended
 * on a state that existed nowhere structurally.
 *
 * Every other machine on a station is scoped inside this one: a bay transition
 * is only reportable, and a session only startable, while the station is
 * `Operational`.
 */

import { StationState } from '../enums/StationState.js';

const { NOT_PROVISIONED, BOOTING, PENDING, REJECTED, OPERATIONAL, DISCONNECTED } = StationState;

/**
 * §1.3. Any transition not listed here is invalid.
 *
 * Note `Booting → Booting`: a response timeout is a real self-transition here,
 * the station re-publishing its BootNotification after 30 s. That is unlike the
 * bay machine, which contains no self-transition at all.
 */
const TRANSITIONS: ReadonlyMap<StationState, ReadonlySet<StationState>> = new Map<
  StationState,
  Set<StationState>
>([
  // Credential obtained (provisioning, out of band, or HTTP).
  [NOT_PROVISIONED, new Set([BOOTING])],
  // RESPONSE Accepted / Pending / Rejected, response timeout, connection lost.
  [BOOTING, new Set([OPERATIONAL, PENDING, REJECTED, BOOTING, DISCONNECTED])],
  // retryInterval elapsed → re-publish BootNotification. NOT to Operational:
  // the server cannot promote a station in place.
  [PENDING, new Set([BOOTING, DISCONNECTED])],
  [REJECTED, new Set([BOOTING, DISCONNECTED])],
  // Reboot (Reset, firmware update, watchdog, power cycle), or connection lost.
  [OPERATIONAL, new Set([BOOTING, DISCONNECTED])],
  // MQTT reconnected → BootNotification with bootReason "Reconnect" if it did
  // not reboot.
  [DISCONNECTED, new Set([BOOTING])],
]);

export function canTransition(from: StationState, to: StationState): boolean {
  return TRANSITIONS.get(from)?.has(to) ?? false;
}

export function allowedTransitions(from: StationState): StationState[] {
  return [...(TRANSITIONS.get(from) ?? [])];
}

/**
 * §1.4: "`Pending` and `Rejected` are both restricted, and they differ in
 * exactly one respect: whether the station answers commands."
 */
export function isRestricted(state: StationState): boolean {
  return state === PENDING || state === REJECTED;
}

/**
 * §1.4 row: *Receives and processes server commands.*
 *
 * `Pending` MUST; `Rejected` MUST NOT. `Pending` exists so a human can repair
 * something — approve a registration, correct a topology record — and the
 * repair may need the command channel. `Rejected` carries no such expectation:
 * the server has said the station is not registered, and it has nothing to
 * configure.
 */
export function mayReceiveCommands(state: StationState): boolean {
  return state === PENDING || state === OPERATIONAL;
}

/**
 * §1.4 row: *Answers a server command with a RESPONSE.*
 *
 * "The distinction is carried by the envelope, not by the action." A restricted
 * station is forbidden `Event` and forbidden any `Request` other than
 * BootNotification; `Response` is permitted in `Pending`, because a RESPONSE is
 * not something the station initiates.
 */
export function mayAnswerCommands(state: StationState): boolean {
  return mayReceiveCommands(state);
}

/**
 * §1.4 row: *Sends anything else unsolicited (EVENT, or a REQUEST it
 * originates).*
 *
 * Only `Operational` MAY. The BootNotification retry is not "anything else" —
 * it is the one message a restricted station MUST send.
 */
export function maySendUnsolicited(state: StationState): boolean {
  return state === OPERATIONAL;
}

/**
 * §1.4 row: *Starts new customer service.*
 *
 * While restricted the station MUST reject StartService and ReserveBay with
 * `3002 BAY_NOT_READY`, on every transport, and MUST NOT authorize a BLE
 * offline session.
 *
 * Serving no customers is not the same as stopping: a session already running
 * MUST continue, be metered, and be settled. A customer who has paid is served.
 */
export function mayStartNewService(state: StationState): boolean {
  return state === OPERATIONAL;
}

/**
 * §1.4 row: *Holds a session key.*
 *
 * "The key row is what makes the rest of the table possible, and it is easy to
 * get wrong." Every command is signed and both directions fail closed, so a
 * `Pending` station that held no key could not be sent a command, could not
 * accept one, and could not answer — the repair channel the `Pending` window
 * exists for would exist only on paper. `Rejected` needs none: it answers
 * nothing.
 */
export function holdsSessionKey(state: StationState): boolean {
  return state === PENDING || state === OPERATIONAL;
}

export class StationStateMachine {
  private _state: StationState;

  constructor(initialState: StationState = StationState.NOT_PROVISIONED) {
    this._state = initialState;
  }

  get state(): StationState {
    return this._state;
  }

  get isRestricted(): boolean {
    return isRestricted(this._state);
  }

  get holdsSessionKey(): boolean {
    return holdsSessionKey(this._state);
  }

  canTransitionTo(to: StationState): boolean {
    return canTransition(this._state, to);
  }

  transition(to: StationState): void {
    if (!this.canTransitionTo(to)) {
      throw new Error(`Invalid station transition: ${this._state} → ${to}`);
    }
    this._state = to;
  }
}

export { TRANSITIONS as STATION_TRANSITIONS };
