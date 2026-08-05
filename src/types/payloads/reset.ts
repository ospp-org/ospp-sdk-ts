/**
 * Reset — reboot the station.
 *
 * There is exactly ONE reset operation and it is a reboot: the firmware
 * restarts and everything persisted survives it. `Soft`/`Hard` are gone, and so
 * is the `type` field that carried them — no value of this message clears
 * credentials, because OSPP has no remote factory reset at all
 * (spec profiles/device-management/reset.md §5.1).
 *
 * The reason the wipe left the wire is that OSPP keeps no bootstrap credential.
 * TR-069 and LwM2M permit a remote wipe and both retain one across it so the
 * device can be re-enrolled; OSPP retained nothing, so `Hard` was a supported
 * command whose success left a station unreachable by every channel it had.
 */

/** Reset REQUEST — Server → Station. */
export interface ResetRequest {
  /**
   * Reboot even while a session is running. Default `false`.
   *
   * Omitted or false: the station REFUSES if any bay has an active session,
   * answering `3016 ACTIVE_SESSIONS_PRESENT`. True: the station settles every
   * active session under the operator-disable policy FIRST — stopped, metered
   * and reported exactly as an operator-initiated stop, so the customer is
   * billed for what they received — and only then reboots.
   *
   * `force` is not a licence to drop a session on the floor; it is a licence to
   * end it without waiting (reset.md §5 rule 3).
   */
  force?: boolean;
}

/** Reset RESPONSE — Station → Server (discriminated union). */
export type ResetResponse =
  | { status: 'Accepted' }
  | { status: 'Rejected'; errorCode: number; errorText: string };
