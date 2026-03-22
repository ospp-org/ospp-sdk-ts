/**
 * Reasons a session may end autonomously (without server-initiated StopService).
 *
 * Source: spec/03-messages.md §5.4 SessionEnded — `reason` enum.
 * Sent in the SessionEnded EVENT payload.
 */
export enum SessionEndReason {
  /** Session durationSeconds elapsed; station auto-stopped. */
  TIMER_EXPIRED = 'TimerExpired',

  /** Hardware fault detected during active session; station auto-stopped. */
  FAULT = 'Fault',
}
