/**
 * Reasons a session may end autonomously (without server-initiated StopService).
 *
 * Source: spec/03-messages.md §5.4 SessionEnded — `reason` enum (5 values as of spec v0.4.0).
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
}
