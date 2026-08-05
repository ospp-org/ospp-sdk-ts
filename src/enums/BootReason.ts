/**
 * Why the station sent this BootNotification.
 *
 * Eight values, and SEVEN of them name an actual boot. `Reconnect` names the
 * case where none occurred — the firmware never restarted, only the MQTT
 * session is new (spec profiles/core/boot-notification.md §5.2).
 *
 * OSPP requires a BootNotification after every connection, reconnections
 * included, because the HMAC session key is scoped to the MQTT session and
 * arrives only in the boot response. Without `Reconnect` a station that merely
 * re-dialled had to pick a value it knew to be false, and a server reading it
 * could not tell whether the firmware's volatile state survived — the question
 * that decides whether a live session is kept or terminated.
 *
 * No member denotes a credential wipe: OSPP has no remote factory reset
 * (profiles/device-management/reset.md §5.1).
 */
export enum BootReason {
  /** Initial power-on. */
  POWER_ON = 'PowerOn',

  /** Watchdog timer triggered reboot. */
  WATCHDOG = 'Watchdog',

  /** Reboot after firmware update. */
  FIRMWARE_UPDATE = 'FirmwareUpdate',

  /**
   * The server asked for this return, via Reset [MSG-015]. Distinguishes a
   * commanded reboot from a spontaneous one (reset.md §5 rule 6).
   */
  REMOTE_RESET = 'RemoteReset',

  /** A human acting at the station. */
  MANUAL_RESET = 'ManualReset',

  /** The station's own scheduled restart. */
  SCHEDULED_RESET = 'ScheduledReset',

  /** Automatic recovery from error state. */
  ERROR_RECOVERY = 'ErrorRecovery',

  /**
   * No boot occurred. The MQTT connection was re-established without the
   * firmware restarting.
   *
   * A station MUST send this when it re-dials without having restarted, and
   * MUST NOT send it when the firmware did restart (§5.2 rule 1).
   */
  RECONNECT = 'Reconnect',
}

/**
 * Does this value name an actual boot?
 *
 * True for seven of the eight. `uptimeSeconds` MUST be consistent with the
 * answer (§5.2 rule 2): a `Reconnect` carries the uptime the station already
 * had — it spans the outage — while every other value carries an uptime
 * measured from the restart it names.
 */
export function bootReasonNamesAnActualBoot(reason: BootReason): boolean {
  return reason !== BootReason.RECONNECT;
}
