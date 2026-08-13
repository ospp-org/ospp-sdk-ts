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
 * §1.4: *"A restricted station may originate exactly those messages that repair
 * its own standing with the server."*
 *
 * BootNotification restores the station's registration; SignCertificate restores
 * the credential without which it cannot connect at all. Nothing else qualifies —
 * every other originated message reports on the station's *work*, and a
 * restricted station has not been cleared to do that work.
 *
 * These are wire `action` values, not message IDs, because that is what the
 * envelope carries.
 */
export const STANDING_REPAIR_ACTIONS: readonly string[] = Object.freeze([
  'BootNotification',
  'SignCertificate',
]);

/**
 * §1.4: may a station in `state` originate `action`?
 *
 * Replaces `maySendUnsolicited(state)`, which asked the question without the one
 * input that decides it. §1.4 is message-dependent — `Pending` may originate
 * SignCertificate and may not originate Heartbeat — and a one-argument boolean
 * cannot carry a message-dependent answer. A second boolean beside the first
 * would not have helped: the first would have gone on returning `false` for a
 * `Pending` SignCertificate.
 *
 * `Operational` may originate anything. A restricted state may originate the
 * standing-repair messages only, and only where it holds the session key those
 * messages must be signed with: SignCertificate is one of the 44 signed message
 * types (Chapter 06 §5.6) and a sender with no key MUST refuse to send rather
 * than send unsigned (§5.7), so `Booting` and `Rejected` cannot send it however
 * this function is called. That is why the specification adds no written scope
 * for it, and says not to.
 *
 * `NotProvisioned` and `Disconnected` answer `false`, as the function this
 * replaces did. That is the §1.4 answer and not a transport claim: a
 * disconnected station is not forbidden to originate, it has no channel to
 * originate on.
 */
export function mayOriginate(state: StationState, action: string): boolean {
  if (state === OPERATIONAL) return true;
  if (state === PENDING) return STANDING_REPAIR_ACTIONS.includes(action);
  if (state === BOOTING || state === REJECTED) return action === 'BootNotification';
  return false;
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
