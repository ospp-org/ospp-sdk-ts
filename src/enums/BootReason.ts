/**
 * Reasons a station may boot/reboot.
 *
 * Source: spec/03-messages.md §1.1 BootNotification — `bootReason` enum.
 * Sent in the BootNotification REQUEST payload.
 */
export enum BootReason {
  /** Initial power-on. */
  POWER_ON = 'PowerOn',

  /** Watchdog timer triggered reboot. */
  WATCHDOG = 'Watchdog',

  /** Reboot after firmware update. */
  FIRMWARE_UPDATE = 'FirmwareUpdate',

  /** Operator-initiated reset. */
  MANUAL_RESET = 'ManualReset',

  /** Scheduled maintenance reboot. */
  SCHEDULED_RESET = 'ScheduledReset',

  /** Automatic recovery from error state. */
  ERROR_RECOVERY = 'ErrorRecovery',
}
