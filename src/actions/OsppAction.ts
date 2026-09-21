/**
 * All 27 MQTT actions defined by the OSPP protocol.
 *
 * Source: spec/spec/03-messages.md — the MQTT Quick Reference table, at the ref
 * pinned in `.spec-ref`. `npm run check:action-registry` compares this enum to
 * that table on every run, in both directions, and compares the 27 above to it
 * as well — so both the membership and the count are derived, not asserted.
 * The same gate compares the six routing buckets below to the Direction and
 * Type columns of that table.
 *
 * The version this file used to name here was `v0.2.5`, twenty-nine minors
 * behind the pin, and no gate could see it because no gate read this file. The
 * number is not restated: `.spec-ref` is the one place that answers "which
 * spec?", and a second copy of an answer is the defect, not the documentation.
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

/**
 * The Direction and Type columns of the same Quick Reference table, as six
 * lists over the enum above.
 *
 * **Why they are here and not in the test.** They lived in
 * `tests/actions/OsppAction.test.ts` as local `const` arrays transcribed from
 * the spec, and the header of that file said so plainly: the gate "does not
 * read the Direction or Type cells, so those two columns are transcribed here
 * and nowhere checked upstream". A transcription with nothing above it is the
 * defect this package has now found three times — the numbers were right and
 * only copying made them right. Moving the lists into `src/` is what lets
 * `check-action-registry` compare them to the catalogue at the pinned ref
 * instead of comparing the test file to itself, and it puts the TypeScript SDK
 * on the same footing as the PHP one, where the equivalent lists have been
 * public accessors on `OsppAction` all along.
 *
 * **The four direction lists are DISJOINT, and that is a choice with a cost.**
 * `ConnectionLost` is `Broker -> Server, or Station -> Server` in the
 * catalogue and sits in the broker list alone, so the station list is
 * station-ONLY; `DataTransfer` is `Bidirectional` and sits in its own list
 * rather than in both. That keeps 11 + 14 + 1 + 1 a partition of the enum
 * rather than a cover of it, which is what the partition assertion in the test
 * needs and what lets the gate compare each of the four spec literals to
 * exactly one list, one to one. The PHP SDK draws the same four literals onto
 * only two accessors and has to project; this side does not, and the finer
 * split is the reason. Callers that want "everything that can arrive from a
 * station" want the broker and bidirectional lists too.
 *
 * Nothing here is re-exported from `src/index.ts`, so the published entry
 * points are unchanged: these are module-level exports that the gate and the
 * test import by path.
 */
export const STATION_TO_SERVER_ACTIONS: readonly OsppAction[] = [
  OsppAction.BOOT_NOTIFICATION,
  OsppAction.AUTHORIZE_OFFLINE_PASS,
  OsppAction.TRANSACTION_EVENT,
  OsppAction.HEARTBEAT,
  OsppAction.STATUS_NOTIFICATION,
  OsppAction.METER_VALUES,
  OsppAction.SESSION_ENDED,
  OsppAction.SECURITY_EVENT,
  OsppAction.FIRMWARE_STATUS_NOTIFICATION,
  OsppAction.DIAGNOSTICS_NOTIFICATION,
  OsppAction.SIGN_CERTIFICATE,
];

export const SERVER_TO_STATION_ACTIONS: readonly OsppAction[] = [
  OsppAction.RESERVE_BAY,
  OsppAction.CANCEL_RESERVATION,
  OsppAction.START_SERVICE,
  OsppAction.STOP_SERVICE,
  OsppAction.CHANGE_CONFIGURATION,
  OsppAction.GET_CONFIGURATION,
  OsppAction.RESET,
  OsppAction.UPDATE_FIRMWARE,
  OsppAction.GET_DIAGNOSTICS,
  OsppAction.SET_MAINTENANCE_MODE,
  OsppAction.UPDATE_SERVICE_CATALOG,
  OsppAction.CERTIFICATE_INSTALL,
  OsppAction.TRIGGER_CERTIFICATE_RENEWAL,
  OsppAction.TRIGGER_MESSAGE,
];

/** `Broker -> Server, or Station -> Server` — published as the broker's LWT. */
export const BROKER_TO_SERVER_ACTIONS: readonly OsppAction[] = [OsppAction.CONNECTION_LOST];

/** `Bidirectional` — the one action either side may originate. */
export const BIDIRECTIONAL_ACTIONS: readonly OsppAction[] = [OsppAction.DATA_TRANSFER];

/** Type `EVENT` — fire and forget, no response expected. */
export const EVENT_ACTIONS: readonly OsppAction[] = [
  OsppAction.STATUS_NOTIFICATION,
  OsppAction.METER_VALUES,
  OsppAction.SESSION_ENDED,
  OsppAction.CONNECTION_LOST,
  OsppAction.SECURITY_EVENT,
  OsppAction.FIRMWARE_STATUS_NOTIFICATION,
  OsppAction.DIAGNOSTICS_NOTIFICATION,
];

/** Type `REQ/RES` — a response is expected within the row's Timeout. */
export const REQ_RES_ACTIONS: readonly OsppAction[] = [
  OsppAction.BOOT_NOTIFICATION,
  OsppAction.AUTHORIZE_OFFLINE_PASS,
  OsppAction.RESERVE_BAY,
  OsppAction.CANCEL_RESERVATION,
  OsppAction.START_SERVICE,
  OsppAction.STOP_SERVICE,
  OsppAction.TRANSACTION_EVENT,
  OsppAction.HEARTBEAT,
  OsppAction.CHANGE_CONFIGURATION,
  OsppAction.GET_CONFIGURATION,
  OsppAction.RESET,
  OsppAction.UPDATE_FIRMWARE,
  OsppAction.GET_DIAGNOSTICS,
  OsppAction.SET_MAINTENANCE_MODE,
  OsppAction.UPDATE_SERVICE_CATALOG,
  OsppAction.SIGN_CERTIFICATE,
  OsppAction.CERTIFICATE_INSTALL,
  OsppAction.TRIGGER_CERTIFICATE_RENEWAL,
  OsppAction.DATA_TRANSFER,
  OsppAction.TRIGGER_MESSAGE,
];
