/**
 * Bay operational states as defined in spec/05-state-machines.md §1.2.
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

  /** Indeterminate — initial state after power-on/reboot, or after ConnectionLost (LWT). */
  UNKNOWN = 'Unknown',
}
