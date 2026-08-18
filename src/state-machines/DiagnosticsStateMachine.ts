/**
 * Diagnostics Upload State Machine — spec/05-state-machines.md §8.
 *
 * Five states, seven edges. Source: §8.3's transition table.
 *
 * Until spec `0.23.0` there was no such section, and this file's header said so:
 * "Source: implied from DiagnosticsNotification status values". It was the only
 * machine in this directory whose source was not a canonical spec table, and the
 * ospp-sdk-php mirror read the same four status words a different way — six edges
 * from `pending`, with `uploaded` and `failed` terminal. Both suites were green.
 *
 * The edges here survived that derivation unchanged. What did not exist, in either
 * SDK, is the bridge below: nothing mapped a wire status onto a state, so a
 * consumer wrote the mapping by hand — and `Uploaded -> Idle` and `Failed -> Idle`
 * have **no wire trigger at all** (§8.4), so a consumer driving this machine from
 * arriving notifications reached `Uploaded` and then refused the `Collecting` that
 * opens the next upload. Single-use, by a different route than the PHP one.
 *
 * Initial state: Idle. Nothing is terminal.
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

/**
 * The four values `schemas/mqtt/diagnostics-notification.schema.json` admits.
 *
 * Declared here, next to the machine, and re-exported by the payload module so the
 * wire union and the FSM vocabulary cannot drift into two hand-kept lists — which
 * is what they were.
 */
export const DIAGNOSTICS_NOTIFICATION_STATUSES = [
  'Collecting',
  'Uploading',
  'Uploaded',
  'Failed',
] as const;

export type DiagnosticsNotificationStatus = (typeof DIAGNOSTICS_NOTIFICATION_STATUSES)[number];

/**
 * The states a DiagnosticsNotification can report — §8.4's mapping, as a type.
 *
 * Derived with `Exclude` rather than re-listed, so the two cannot drift; the same
 * shape `BayStatus`/`ReportableBayStatus` already uses for the one vocabulary in
 * this SDK that was never split in two.
 */
export type ReportableDiagnosticsState = Exclude<DiagnosticsState, 'Idle'>;

/** §8.4: `Idle` is reported by nothing, in either direction. */
export function isReportableDiagnosticsState(
  state: DiagnosticsState,
): state is ReportableDiagnosticsState {
  return state !== 'Idle';
}

export function isDiagnosticsNotificationStatus(
  value: string,
): value is DiagnosticsNotificationStatus {
  return (DIAGNOSTICS_NOTIFICATION_STATUSES as readonly string[]).includes(value);
}

/**
 * Wire -> machine. §8.4's mapping in the direction a server consumes it.
 *
 * There is deliberately no value that yields `Idle`. §8.4: "`Uploaded -> Idle` and
 * `Failed -> Idle` have no wire trigger, and a server must not wait for one." A
 * bridge that could produce `Idle` from a message would be inventing the one edge
 * the protocol never announces.
 *
 * @throws {RangeError} on any value outside the notification enum
 */
export function diagnosticsStateFromNotificationStatus(
  status: string,
): ReportableDiagnosticsState {
  if (!isDiagnosticsNotificationStatus(status)) {
    throw new RangeError(`Unknown diagnostics notification status: ${status}`);
  }
  return status;
}

/** Machine -> wire. `null` for `Idle`, which no notification carries. */
export function diagnosticsStateToNotificationStatus(
  state: DiagnosticsState,
): DiagnosticsNotificationStatus | null {
  return state === 'Idle' ? null : state;
}

/**
 * Advance a machine from an arriving DiagnosticsNotification.
 *
 * This is the function whose absence made the machine unusable as a notification
 * consumer. §8.4: "The repeated `Uploading` notifications are one state, not many.
 * §8.3 has no `Uploading -> Uploading` edge and MUST NOT gain one: the progress
 * stream is the station re-reporting a state it has not left. A server that drives
 * this machine by feeding it arriving notifications MUST advance on a *change* of
 * `status` and MUST NOT treat a second `Uploading` as an invalid transition."
 *
 * So a repeat of the current state is accepted and is not a transition. Anything
 * else is judged against §8.3 and throws if the table does not list it.
 *
 * @returns the state after the notification
 */
export function applyDiagnosticsNotification(
  current: DiagnosticsState,
  status: string,
): DiagnosticsState {
  const reported = diagnosticsStateFromNotificationStatus(status);
  if (reported === current) return current; // progress report, not a transition
  if (!canTransition(current, reported)) {
    throw new Error(`Invalid diagnostics transition: ${current} → ${reported}`);
  }
  return reported;
}
