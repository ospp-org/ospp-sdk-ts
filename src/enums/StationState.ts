/**
 * The six states of the station state machine — spec/05-state-machines.md §1.
 *
 * This is the OUTERMOST machine: every other machine on a station is scoped
 * inside it. A bay transition is only reportable, and a session only startable,
 * while the station is `Operational`. A station MUST be in exactly one of these
 * six at all times.
 *
 * Two other machines in the chapter also have a state named `Pending` — the
 * session machine and the reservation machine. They are unrelated. This
 * `Pending` is the only one a BootNotification RESPONSE can carry.
 *
 * Which party holds which: the station holds all six about itself. The server
 * holds five — it never observes `Booting`, because the REQUEST that opens it
 * and the RESPONSE that closes it are one exchange the server completes
 * synchronously.
 */
export enum StationState {
  /**
   * The station holds no operator-issued client certificate and cannot open an
   * mTLS connection to the broker.
   *
   * OSPP does not begin here, and a station MUST NOT enter this state
   * autonomously — there is no remote credential wipe (reset.md §5.1).
   */
  NOT_PROVISIONED = 'NotProvisioned',

  /**
   * Connected, subscribed, BootNotification published, waiting for the
   * RESPONSE.
   *
   * Restricted more tightly than `Pending`: it holds no session key yet, so it
   * can neither sign nor verify, and therefore cannot process a command even if
   * one arrives.
   */
  BOOTING = 'Booting',

  /**
   * The server accepted the connection but has not cleared the station for
   * service — an operator approval is outstanding, or a `3018
   * TOPOLOGY_MISMATCH` needs repair.
   *
   * A RESTRICTED state: the station answers commands and sends nothing
   * unsolicited. It DOES hold a session key — the response that put it here
   * carries one — because every command it answers is signed.
   */
  PENDING = 'Pending',

  /**
   * The server refused the boot and said why.
   *
   * A RESTRICTED state, and stricter than `Pending`: the station also refuses
   * commands, because the server that would send them does not consider it
   * registered — and it holds no session key, so it could not verify one.
   */
  REJECTED = 'Rejected',

  /**
   * The boot was `Accepted`. The station has a session key, has reported every
   * bay, is heartbeating, accepts and executes commands, and serves customers.
   * The only state in which a session may start.
   */
  OPERATIONAL = 'Operational',

  /**
   * No MQTT connection. Hardware keeps running: active sessions continue on the
   * station's local timer, BLE stays available, and events are buffered.
   *
   * The station is not idle here — it is operating without a server. The server
   * infers this state from the LWT or a heartbeat timeout and holds every bay
   * at `Unknown`; it is the station-scope twin of a bay's `Unknown`.
   */
  DISCONNECTED = 'Disconnected',
}
