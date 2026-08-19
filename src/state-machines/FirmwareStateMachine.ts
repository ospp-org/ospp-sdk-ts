/**
 * Firmware Update State Machine — 10 states, governs OTA update process.
 *
 * Source: spec/05-state-machines.md §6. Initial state: Idle. Terminal state:
 * Activated. Failed always transitions back to Idle (rollback complete).
 *
 * The wire -> machine bridge is at the foot of this file. The gap it spans is the
 * widest in the chapter: a FirmwareStatusNotification carries FIVE of these ten
 * states (§6.6), and the other five split two ways — four that nothing on the wire
 * can ever set, and `Activated`, which is reported by a different message
 * altogether. Until it existed, this SDK's firmware machine could be driven only by
 * a consumer that already knew all of that, and `types/payloads/
 * firmware-status-notification.ts` kept a second copy of the wire union that
 * nothing compared against this one.
 */

import { OsppAction } from '../actions/OsppAction.js';

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

/**
 * The five values `schemas/mqtt/firmware-status-notification.schema.json` admits.
 *
 * Declared here, next to the machine, and re-exported by the payload module so the
 * wire union and the FSM vocabulary cannot drift into two hand-kept lists — which
 * is what they were: `types/payloads/firmware-status-notification.ts` carried its
 * own copy of this union with nothing comparing the two.
 */
export const FIRMWARE_NOTIFICATION_STATUSES = [
  'Downloading',
  'Downloaded',
  'Installing',
  'Installed',
  'Failed',
] as const;

export type FirmwareNotificationStatus = (typeof FIRMWARE_NOTIFICATION_STATUSES)[number];

/**
 * The states a FirmwareStatusNotification can report — §6.6's mapping, as a type.
 *
 * Derived from the wire list with `Extract` rather than re-listed, so the two
 * cannot drift; the same shape `BayStatus`/`ReportableBayStatus` and
 * `DiagnosticsState`/`ReportableDiagnosticsState` already use.
 */
export type ReportableFirmwareState = Extract<FirmwareState, FirmwareNotificationStatus>;

/**
 * The four states §6.6 calls unobservable — nothing on the wire can ever set them.
 *
 * Derived, so it is five-minus-`Activated` by construction rather than by a second
 * hand-kept list. `Activated` is excluded because it IS observed, by
 * BootNotification [MSG-001]; see {@link firmwareStateObservedBy}.
 */
export type UnobservableFirmwareState = Exclude<
  FirmwareState,
  ReportableFirmwareState | 'Activated'
>;

export function isFirmwareNotificationStatus(value: string): value is FirmwareNotificationStatus {
  return (FIRMWARE_NOTIFICATION_STATUSES as readonly string[]).includes(value);
}

/** §6.6: five of the ten states have a FirmwareStatusNotification value. */
export function isReportableFirmwareState(state: FirmwareState): state is ReportableFirmwareState {
  return isFirmwareNotificationStatus(state);
}

/**
 * Whether the server is ever told this state, by any message — §6.6.
 *
 * False for exactly four states. This is the predicate the diagnostics bridge never
 * needed: there, "not reportable" and "never observed" were the same one state,
 * `Idle`. Here they differ by `Activated`, which has no FirmwareStatusNotification
 * value and is reported all the same — §6.6: "Reported via BootNotification
 * [MSG-001], not FirmwareStatusNotification."
 *
 * A server that conflated the two would either wait forever to be told about a
 * `Verifying` that has no message, or throw away the BootNotification that is the
 * only report a completed update ever gets.
 */
export function isObservableFirmwareState(state: FirmwareState): boolean {
  return firmwareStateObservedBy(state) !== null;
}

/**
 * The message that reports this state, or `null` if nothing does — §6.6.
 *
 * The four nulls are not a gap to be closed. `Rebooting` is unobservable because
 * the station is offline for the whole of it; `Verifying` and `Verified` because
 * that silent interval is where the SHA-256 and the ECDSA P-256 verification run
 * over the whole image; `Idle` because the absence of an update is not an event.
 */
export function firmwareStateObservedBy(state: FirmwareState): OsppAction | null {
  if (isReportableFirmwareState(state)) return OsppAction.FIRMWARE_STATUS_NOTIFICATION;
  if (state === 'Activated') return OsppAction.BOOT_NOTIFICATION;
  return null;
}

/**
 * Wire -> machine. §6.6's mapping in the direction a server consumes it.
 *
 * There is deliberately no value that yields any of the four unobservable states,
 * and none that yields `Activated` either — that one arrives on BootNotification,
 * and a bridge that produced it from a FirmwareStatusNotification would be
 * inventing a message.
 *
 * @throws {RangeError} on any value outside the notification enum
 */
export function firmwareStateFromNotificationStatus(status: string): ReportableFirmwareState {
  if (!isFirmwareNotificationStatus(status)) {
    throw new RangeError(`Unknown firmware notification status: ${status}`);
  }
  return status;
}

/**
 * Machine -> wire. `null` for the five states no FirmwareStatusNotification carries.
 *
 * Null for `Activated` too. That is not a hole — {@link firmwareStateObservedBy}
 * names the message that does carry it. A null here means the state must not be
 * transmitted as a firmware status, whatever else may be true of it.
 */
export function firmwareStateToNotificationStatus(
  state: FirmwareState,
): FirmwareNotificationStatus | null {
  return isReportableFirmwareState(state) ? state : null;
}

/**
 * The reportable states that can legitimately arrive next, from `from`.
 *
 * This is the function the diagnostics bridge did not need. There, every edge of
 * §8.3 runs between two states the wire carries, so the sequence a server observes
 * IS a walk of the table and `canTransition` answers directly.
 *
 * Here it is not. Four states are unobservable (§6.6) and three of the thirteen
 * edges pass through them, so the conforming notification sequence SKIPS states:
 *
 *   `Downloaded -> Verifying -> Verified -> Installing`
 *
 * is what the station does, and `Downloaded` then `Installing` is what the server
 * is told. A consumer that fed those two into `canTransition` would refuse the
 * update at the point it starts installing — §6.3 has no `Downloaded -> Installing`
 * row and MUST NOT gain one. The edge is not missing; the two states between it are
 * silent.
 *
 * So the answer is the set of reportable states reachable by a path whose
 * INTERMEDIATE states are all unobservable. `Activated` is neither returned nor
 * traversed: it is observable, so a server is told about it and must not have it
 * inferred, and it is terminal besides.
 */
export function observableFirmwareTargets(from: FirmwareState): ReportableFirmwareState[] {
  const reachable = new Set<ReportableFirmwareState>();
  const seen = new Set<FirmwareState>([from]);
  const queue: FirmwareState[] = [from];

  while (queue.length > 0) {
    const state = queue.shift() as FirmwareState;

    for (const target of TRANSITIONS.get(state) ?? []) {
      if (isReportableFirmwareState(target)) {
        reachable.add(target);
        continue;
      }
      // Observable but not reportable — `Activated`. The server hears about it from
      // another message; it is not something to walk past.
      if (isObservableFirmwareState(target)) continue;

      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }

  return [...reachable];
}

/**
 * Advance a server's mirror of the machine from one arriving
 * FirmwareStatusNotification.
 *
 * Two rules, and neither is `canTransition`:
 *
 *  * A repeat of the state already held is a PROGRESS report, not a transition.
 *    `firmware-status.md` §5 rules 1 and 2 ask for a notification every 10% of
 *    `Downloading` and at four milestones of `Installing`, and §6.3 has no self-edge
 *    for either. This is the same rule §8.4 states for the repeated `Uploading`
 *    stream.
 *  * Anything else is judged against {@link observableFirmwareTargets}, which walks
 *    the unobservable states the wire cannot report.
 *
 * @returns the state after the notification
 * @throws {RangeError} on a status outside the notification enum
 * @throws {Error} on a sequence §6.3 cannot produce
 */
export function applyFirmwareNotification(current: FirmwareState, status: string): FirmwareState {
  const reported = firmwareStateFromNotificationStatus(status);
  if (reported === current) return current; // progress report, not a transition
  if (!observableFirmwareTargets(current).includes(reported)) {
    throw new Error(`Invalid firmware transition: ${current} → ${reported}`);
  }
  return reported;
}
