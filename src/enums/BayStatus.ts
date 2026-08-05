/**
 * Bay operational states as defined in spec/05-state-machines.md §2.2.
 *
 * Every bay MUST be in exactly one of these 7 states at all times.
 * The station MUST send a StatusNotification EVENT on every state transition.
 */
export enum BayStatus {
  /** Bay is idle and ready to accept a session or reservation. */
  AVAILABLE = 'Available',

  /** Bay is reserved for a specific user via ReserveBay. Countdown timer active. */
  RESERVED = 'Reserved',

  /** A session is active. Station is delivering the service. */
  OCCUPIED = 'Occupied',

  /** Session ended. Station is performing post-session hardware wind-down. */
  FINISHING = 'Finishing',

  /** Hardware or software fault. Bay MUST NOT accept StartService or ReserveBay. */
  FAULTED = 'Faulted',

  /** Administratively disabled or under maintenance (SetMaintenanceMode). */
  UNAVAILABLE = 'Unavailable',

  /**
   * Indeterminate — initial state after power-on/reboot, or after ConnectionLost (LWT).
   *
   * NOT a wire value. A station enters this at power-on and leaves it by self-test; a
   * server enters it on connection loss and leaves it on the next accepted
   * StatusNotification. Both parties hold it, neither transmits it — so it is absent
   * from `bay-status.schema.json` and excluded from {@link ReportableBayStatus}.
   *
   * The member stays because the FSM needs it: it is {@link BayStateMachine}'s initial
   * state, which the spec requires (01-architecture.md §7.3, First Boot step 1).
   */
  UNKNOWN = 'Unknown',
}

/**
 * The six bay states that may appear in a message.
 *
 * `BayStatus` is the FSM's vocabulary — seven states. This is the wire's — six. Use it
 * for any field that is serialised or parsed; use `BayStatus` for state a party merely
 * holds. Spec v0.10.0 removed `Unknown` from `bay-status.schema.json`
 * (05-state-machines.md §2.2).
 *
 * Derived with `Exclude` rather than re-listed, so the two cannot drift.
 */
export type ReportableBayStatus = Exclude<BayStatus, BayStatus.UNKNOWN>;

/**
 * Runtime narrowing to {@link ReportableBayStatus}.
 *
 * The type alias is erased at runtime, so a value parsed from JSON needs this before it
 * can be trusted as wire-legal. Gate on it before publishing a StatusNotification built
 * from a bay's current state — reading a bay machine's power-on value straight into a
 * payload is the mistake this release exists to prevent.
 */
export function isReportableBayStatus(status: BayStatus): status is ReportableBayStatus {
  return status !== BayStatus.UNKNOWN;
}
