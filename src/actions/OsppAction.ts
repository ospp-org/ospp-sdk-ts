/**
 * All 27 MQTT actions defined by the OSPP protocol v0.2.5.
 *
 * Source: spec/spec/03-messages.md — Quick Reference + §5.4 SessionEnded.
 *
 * The action value is carried in the `action` field of the MQTT envelope.
 * There is NO topic-per-action — all messages flow through two topics per
 * station (to-server / to-station). The action field identifies the message.
 */
export enum OsppAction {
  // --- Provisioning ---
  BOOT_NOTIFICATION = 'BootNotification',

  // --- Auth ---
  AUTHORIZE_OFFLINE_PASS = 'AuthorizeOfflinePass',

  // --- Session ---
  RESERVE_BAY = 'ReserveBay',
  CANCEL_RESERVATION = 'CancelReservation',
  START_SERVICE = 'StartService',
  STOP_SERVICE = 'StopService',

  // --- Payment ---
  TRANSACTION_EVENT = 'TransactionEvent',

  // --- Status ---
  HEARTBEAT = 'Heartbeat',
  STATUS_NOTIFICATION = 'StatusNotification',
  METER_VALUES = 'MeterValues',
  SESSION_ENDED = 'SessionEnded',
  CONNECTION_LOST = 'ConnectionLost',
  SECURITY_EVENT = 'SecurityEvent',

  // --- Config ---
  CHANGE_CONFIGURATION = 'ChangeConfiguration',
  GET_CONFIGURATION = 'GetConfiguration',
  RESET = 'Reset',
  SET_MAINTENANCE_MODE = 'SetMaintenanceMode',

  // --- Firmware ---
  UPDATE_FIRMWARE = 'UpdateFirmware',
  FIRMWARE_STATUS_NOTIFICATION = 'FirmwareStatusNotification',

  // --- Diagnostics ---
  GET_DIAGNOSTICS = 'GetDiagnostics',
  DIAGNOSTICS_NOTIFICATION = 'DiagnosticsNotification',

  // --- Service Catalog ---
  UPDATE_SERVICE_CATALOG = 'UpdateServiceCatalog',

  // --- Security / Certificates ---
  SIGN_CERTIFICATE = 'SignCertificate',
  CERTIFICATE_INSTALL = 'CertificateInstall',
  TRIGGER_CERTIFICATE_RENEWAL = 'TriggerCertificateRenewal',

  // --- Core ---
  DATA_TRANSFER = 'DataTransfer',
  TRIGGER_MESSAGE = 'TriggerMessage',
}
