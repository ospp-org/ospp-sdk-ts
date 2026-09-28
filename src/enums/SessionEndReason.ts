/**
 * Reasons a session may end autonomously (without server-initiated StopService).
 *
 * Source: spec/03-messages.md §5.4 SessionEnded — `reason` enum (7 values as of spec 0.43.0).
 * Refund policy per reason: spec/04-flows.md §6.
 * Sent in the SessionEnded EVENT payload.
 */
export enum SessionEndReason {
  /** Session durationSeconds elapsed; station auto-stopped. Charged for full pre-authorized duration. */
  TIMER_EXPIRED = 'TimerExpired',

  /** Hardware fault detected during active session; station auto-stopped. Pro-rated refund (or full refund if <50% delivered). */
  FAULT = 'Fault',

  /** User manually stopped at the station (e.g., physical Stop button). Pro-rated refund. */
  LOCAL = 'Local',

  /** Offline credit pool exhausted mid-session. Full refund — `creditsCharged` MUST be 0. */
  LOCAL_OUT_OF_CREDIT = 'LocalOutOfCredit',

  /** Offline pass revoked mid-session via RevocationEpoch bump. Full refund — `creditsCharged` MUST be 0. */
  DEAUTHORIZED = 'Deauthorized',

  /**
   * An operator ended the session deliberately — a Reset carrying `force: true`,
   * or a station disable.
   *
   * The station settles it under the operator-disable policy (04-flows.md) before
   * it acts: the session is stopped, metered from the time ACTUALLY DELIVERED, and
   * reported with the `actualDurationSeconds` delivered and the `creditsCharged`
   * those seconds earned. That report is the same whatever the service kind — the
   * station does not know the kind and decides no money.
   *
   * What the customer pays is the SERVER's decision, by service kind: 03-messages.md
   * §5.4 settles it "pro-rata on delivered time for `UserDuration`, a full refund for
   * `FixedDuration` and `MultiUnit`, because the operator, not the customer, cut the
   * preset short". That is spec 0.44.0. Until then both preset kinds were charged in
   * full on this reason, and only `UserDuration` was pro-rata.
   *
   * The server settles a stop it issues itself for an operator the same way, by
   * kind — StopService from a console, or a station disable the server carries out.
   * No SessionEnded reports that stop and StopService carries no reason, so only
   * the server knows an operator asked for it (04-flows.md §6, Settlement by
   * Service Kind).
   *
   * It needed a member of its own because `Deauthorized`, the nearest alternative,
   * carries "Session MUST be billed at zero" (03-messages.md §5.4): reusing it would
   * erase the delivered time a `UserDuration` session is billed on.
   */
  OPERATOR_STOPPED = 'OperatorStopped',

  /**
   * The `SessionTimeout` idle timer elapsed — no user interaction within the
   * window, so the station stopped the service on its own.
   *
   * spec 0.31.0 08-configuration.md `SessionTimeout`: **MeterValues do NOT reset
   * the timer.** They are the station's own telemetry, emitted on a timer whether
   * or not a customer is present, so counting them would make the timer measure
   * the station rather than the user. The registry's *no user interaction* is the
   * trigger; 05-state-machines.md §3.4's *no MeterValues or user interaction* was
   * an unswept restatement and the registry always governed.
   *
   * Billed **pro-rata on delivered duration** — the customer received service and
   * then stopped engaging with it, the same shape as `Local`, and settled the same
   * way (04-flows.md §6). It is therefore NOT one of the zero-billing reasons.
   *
   * The seventh member. The enum was closed at six and none of them was true of an
   * idle stop, so the one EVENT required to report it (session-ended.md §6) had no
   * value to report it with, and a station had to choose between an inaccurate
   * `reason` and a silent termination. 0.30.0's note declined the widening; 0.31.0
   * makes it, on the argument that an obligation with no legal value to satisfy it
   * is not an unimplemented rule but an unimplementable one.
   */
  INACTIVITY = 'Inactivity',
}
