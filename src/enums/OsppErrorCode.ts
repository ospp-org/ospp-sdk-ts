/**
 * All 102 standard OSPP error codes with static metadata.
 *
 * Source: spec/07-errors.md §3.1–§3.6.
 *
 * Ranges:
 *   1000–1999  Transport
 *   2000–2999  Auth & Authorization
 *   3000–3999  Session & Bay
 *   4000–4999  Payment & Credit (includes certificate management 4010–4014)
 *   5000–5999  Station Hardware & Software
 *   6000–6999  Server
 *   9000–9999  Vendor-Specific (reserved, not enumerated here)
 */

// ---------------------------------------------------------------------------
// Severity & Category types
// ---------------------------------------------------------------------------

export type OsppErrorSeverity = 'Critical' | 'Error' | 'Warning' | 'Info';

export type OsppErrorCategory =
  | 'Transport'
  | 'Auth'
  | 'Session'
  | 'Payment'
  | 'Hardware'
  | 'Server'
  | 'Vendor';

// ---------------------------------------------------------------------------
// Metadata interface
// ---------------------------------------------------------------------------

/**
 * Static metadata for a single OSPP error code.
 *
 * `httpStatus` is an SDK extension (NOT in spec §1.3 Error Object).
 * Derived from the HTTP status mapping table in spec §2.4.
 */
export interface OsppErrorMeta {
  code: number;
  text: string;
  severity: OsppErrorSeverity;
  recoverable: boolean;
  httpStatus: number;
  category: OsppErrorCategory;
}

// ---------------------------------------------------------------------------
// Enum — numeric error codes
// ---------------------------------------------------------------------------

export enum OsppErrorCode {
  // --- Transport (1xxx) ---
  TRANSPORT_GENERIC         = 1000,
  MQTT_CONNECTION_LOST      = 1001,
  MQTT_PUBLISH_FAILED       = 1002,
  TLS_HANDSHAKE_FAILED      = 1003,
  CERTIFICATE_ERROR         = 1004,
  INVALID_MESSAGE_FORMAT    = 1005,
  UNKNOWN_ACTION            = 1006,
  PROTOCOL_VERSION_MISMATCH = 1007,
  BLE_RADIO_ERROR           = 1008,
  DNS_RESOLUTION_FAILED     = 1009,
  MESSAGE_TIMEOUT           = 1010,
  URL_UNREACHABLE           = 1011,
  MAC_VERIFICATION_FAILED   = 1012,
  MAC_MISSING               = 1013,
  MESSAGE_TOO_LARGE         = 1014,

  // --- Auth & Authorization (2xxx) ---
  AUTH_GENERIC              = 2000,
  STATION_NOT_REGISTERED    = 2001,
  OFFLINE_PASS_INVALID      = 2002,
  OFFLINE_PASS_EXPIRED      = 2003,
  OFFLINE_EPOCH_REVOKED     = 2004,
  OFFLINE_COUNTER_REPLAY    = 2005,
  OFFLINE_STATION_MISMATCH  = 2006,
  COMMAND_NOT_SUPPORTED     = 2007,
  ACTION_NOT_PERMITTED      = 2008,
  JWT_EXPIRED               = 2009,
  JWT_INVALID               = 2010,
  SESSION_TOKEN_EXPIRED     = 2011,
  SESSION_TOKEN_INVALID     = 2012,
  BLE_AUTH_FAILED           = 2013,

  // --- Session & Bay (3xxx) ---
  SESSION_GENERIC           = 3000,
  BAY_BUSY                  = 3001,
  BAY_NOT_READY             = 3002,
  SERVICE_UNAVAILABLE       = 3003,
  INVALID_SERVICE           = 3004,
  BAY_NOT_FOUND             = 3005,
  SESSION_NOT_FOUND         = 3006,
  SESSION_MISMATCH          = 3007,
  DURATION_INVALID          = 3008,
  HARDWARE_ACTIVATION_FAILED = 3009,
  MAX_DURATION_EXCEEDED     = 3010,
  BAY_MAINTENANCE           = 3011,
  RESERVATION_NOT_FOUND     = 3012,
  RESERVATION_EXPIRED       = 3013,
  BAY_RESERVED              = 3014,
  PAYLOAD_INVALID           = 3015,
  ACTIVE_SESSIONS_PRESENT   = 3016,

  // --- Payment & Credit (4xxx) ---
  PAYMENT_GENERIC           = 4000,
  INSUFFICIENT_BALANCE      = 4001,
  OFFLINE_LIMIT_EXCEEDED    = 4002,
  OFFLINE_RATE_LIMITED       = 4003,
  OFFLINE_PER_TX_EXCEEDED   = 4004,
  PAYMENT_FAILED            = 4005,
  PAYMENT_TIMEOUT           = 4006,
  REFUND_FAILED             = 4007,
  WEBHOOK_SIGNATURE_INVALID = 4008,
  // 4009 not defined
  CSR_INVALID               = 4010,
  CERTIFICATE_CHAIN_INVALID = 4011,
  CERTIFICATE_TYPE_MISMATCH = 4012,
  RENEWAL_DENIED            = 4013,
  KEYPAIR_GENERATION_FAILED = 4014,

  // --- Station Hardware (5.0xx) ---
  HARDWARE_GENERIC          = 5000,
  PUMP_SYSTEM               = 5001,
  FLUID_SYSTEM              = 5002,
  CONSUMABLE_SYSTEM         = 5003,
  ELECTRICAL_SYSTEM         = 5004,
  PAYMENT_HARDWARE          = 5005,
  HEATING_SYSTEM            = 5006,
  MECHANICAL_SYSTEM         = 5007,
  SENSOR_FAILURE            = 5008,
  EMERGENCY_STOP            = 5009,

  // --- Firmware Update (5.01x) ---
  DOWNLOAD_FAILED           = 5014,
  CHECKSUM_MISMATCH         = 5015,
  VERSION_ALREADY_INSTALLED = 5016,
  INSUFFICIENT_STORAGE      = 5017,
  INSTALLATION_FAILED       = 5018,

  // --- Diagnostics & Catalog (5.02x) ---
  UPLOAD_FAILED             = 5019,
  INVALID_TIME_WINDOW       = 5020,
  NO_DIAGNOSTICS_AVAILABLE  = 5021,
  // 5022 not defined
  INVALID_CATALOG           = 5023,
  UNSUPPORTED_SERVICE       = 5024,
  CATALOG_TOO_LARGE         = 5025,

  // --- Station Software (5.1xx) ---
  SOFTWARE_GENERIC          = 5100,
  FIRMWARE_ERROR            = 5101,
  CONFIGURATION_ERROR       = 5102,
  STORAGE_ERROR             = 5103,
  WATCHDOG_RESET            = 5104,
  MEMORY_ERROR              = 5105,
  CLOCK_ERROR               = 5106,
  OPERATION_IN_PROGRESS     = 5107,
  CONFIGURATION_KEY_READONLY = 5108,
  INVALID_CONFIGURATION_VALUE = 5109,
  RESET_FAILED              = 5110,
  BUFFER_FULL               = 5111,
  FIRMWARE_SIGNATURE_INVALID = 5112,

  // --- Server (6xxx) ---
  SERVER_GENERIC            = 6000,
  SERVER_INTERNAL_ERROR     = 6001,
  ACK_TIMEOUT               = 6002,
  STATION_OFFLINE           = 6003,
  VALIDATION_ERROR          = 6004,
  SESSION_ALREADY_ACTIVE    = 6005,
  RATE_LIMIT_EXCEEDED       = 6006,
  SERVICE_DEGRADED          = 6007,
}

// ---------------------------------------------------------------------------
// Registry — static metadata per error code
// ---------------------------------------------------------------------------

function meta(
  code: number,
  text: string,
  severity: OsppErrorSeverity,
  recoverable: boolean,
  httpStatus: number,
  category: OsppErrorCategory,
): OsppErrorMeta {
  return { code, text, severity, recoverable, httpStatus, category };
}

/**
 * Complete registry mapping every OsppErrorCode to its static metadata.
 *
 * `httpStatus` values: explicit ones from spec §2.4 HTTP status mapping table;
 * the rest are sensible defaults derived by category/semantics (SDK extension).
 */
export const OSPP_ERROR_REGISTRY: Readonly<Record<OsppErrorCode, OsppErrorMeta>> = {
  // ── Transport (1xxx) ──────────────────────────────────────────────────
  [OsppErrorCode.TRANSPORT_GENERIC]:         meta(1000, 'TRANSPORT_GENERIC',         'Error',    true,  500, 'Transport'),
  [OsppErrorCode.MQTT_CONNECTION_LOST]:      meta(1001, 'MQTT_CONNECTION_LOST',      'Error',    true,  502, 'Transport'),
  [OsppErrorCode.MQTT_PUBLISH_FAILED]:       meta(1002, 'MQTT_PUBLISH_FAILED',       'Error',    true,  502, 'Transport'),
  [OsppErrorCode.TLS_HANDSHAKE_FAILED]:      meta(1003, 'TLS_HANDSHAKE_FAILED',      'Critical', false, 500, 'Transport'),
  [OsppErrorCode.CERTIFICATE_ERROR]:         meta(1004, 'CERTIFICATE_ERROR',         'Critical', false, 500, 'Transport'),
  [OsppErrorCode.INVALID_MESSAGE_FORMAT]:    meta(1005, 'INVALID_MESSAGE_FORMAT',    'Error',    false, 400, 'Transport'),
  [OsppErrorCode.UNKNOWN_ACTION]:            meta(1006, 'UNKNOWN_ACTION',            'Warning',  false, 400, 'Transport'),
  [OsppErrorCode.PROTOCOL_VERSION_MISMATCH]: meta(1007, 'PROTOCOL_VERSION_MISMATCH', 'Error',    false, 400, 'Transport'),
  [OsppErrorCode.BLE_RADIO_ERROR]:           meta(1008, 'BLE_RADIO_ERROR',           'Warning',  true,  500, 'Transport'),
  [OsppErrorCode.DNS_RESOLUTION_FAILED]:     meta(1009, 'DNS_RESOLUTION_FAILED',     'Error',    true,  502, 'Transport'),
  [OsppErrorCode.MESSAGE_TIMEOUT]:           meta(1010, 'MESSAGE_TIMEOUT',           'Warning',  true,  504, 'Transport'),
  [OsppErrorCode.URL_UNREACHABLE]:           meta(1011, 'URL_UNREACHABLE',           'Error',    true,  502, 'Transport'),
  [OsppErrorCode.MAC_VERIFICATION_FAILED]:   meta(1012, 'MAC_VERIFICATION_FAILED',   'Critical', false, 401, 'Transport'),
  [OsppErrorCode.MAC_MISSING]:               meta(1013, 'MAC_MISSING',               'Error',    false, 401, 'Transport'),
  [OsppErrorCode.MESSAGE_TOO_LARGE]:         meta(1014, 'MESSAGE_TOO_LARGE',         'Error',    false, 413, 'Transport'),

  // ── Auth & Authorization (2xxx) ───────────────────────────────────────
  [OsppErrorCode.AUTH_GENERIC]:              meta(2000, 'AUTH_GENERIC',              'Error',    false, 401, 'Auth'),
  [OsppErrorCode.STATION_NOT_REGISTERED]:    meta(2001, 'STATION_NOT_REGISTERED',    'Error',    false, 401, 'Auth'),
  [OsppErrorCode.OFFLINE_PASS_INVALID]:      meta(2002, 'OFFLINE_PASS_INVALID',      'Error',    false, 401, 'Auth'),
  [OsppErrorCode.OFFLINE_PASS_EXPIRED]:      meta(2003, 'OFFLINE_PASS_EXPIRED',      'Warning',  true,  401, 'Auth'),
  [OsppErrorCode.OFFLINE_EPOCH_REVOKED]:     meta(2004, 'OFFLINE_EPOCH_REVOKED',     'Error',    false, 401, 'Auth'),
  [OsppErrorCode.OFFLINE_COUNTER_REPLAY]:    meta(2005, 'OFFLINE_COUNTER_REPLAY',    'Critical', false, 401, 'Auth'),
  [OsppErrorCode.OFFLINE_STATION_MISMATCH]:  meta(2006, 'OFFLINE_STATION_MISMATCH',  'Error',    false, 403, 'Auth'),
  [OsppErrorCode.COMMAND_NOT_SUPPORTED]:     meta(2007, 'COMMAND_NOT_SUPPORTED',     'Warning',  false, 501, 'Auth'),
  [OsppErrorCode.ACTION_NOT_PERMITTED]:      meta(2008, 'ACTION_NOT_PERMITTED',      'Error',    false, 403, 'Auth'),
  [OsppErrorCode.JWT_EXPIRED]:               meta(2009, 'JWT_EXPIRED',               'Warning',  true,  401, 'Auth'),
  [OsppErrorCode.JWT_INVALID]:               meta(2010, 'JWT_INVALID',               'Error',    false, 401, 'Auth'),
  [OsppErrorCode.SESSION_TOKEN_EXPIRED]:     meta(2011, 'SESSION_TOKEN_EXPIRED',     'Warning',  true,  401, 'Auth'),
  [OsppErrorCode.SESSION_TOKEN_INVALID]:     meta(2012, 'SESSION_TOKEN_INVALID',     'Error',    false, 401, 'Auth'),
  [OsppErrorCode.BLE_AUTH_FAILED]:           meta(2013, 'BLE_AUTH_FAILED',           'Error',    false, 401, 'Auth'),

  // ── Session & Bay (3xxx) ──────────────────────────────────────────────
  [OsppErrorCode.SESSION_GENERIC]:           meta(3000, 'SESSION_GENERIC',           'Error',    true,  500, 'Session'),
  [OsppErrorCode.BAY_BUSY]:                  meta(3001, 'BAY_BUSY',                  'Warning',  true,  409, 'Session'),
  [OsppErrorCode.BAY_NOT_READY]:             meta(3002, 'BAY_NOT_READY',             'Warning',  true,  409, 'Session'),
  [OsppErrorCode.SERVICE_UNAVAILABLE]:       meta(3003, 'SERVICE_UNAVAILABLE',       'Warning',  true,  503, 'Session'),
  [OsppErrorCode.INVALID_SERVICE]:           meta(3004, 'INVALID_SERVICE',           'Error',    false, 422, 'Session'),
  [OsppErrorCode.BAY_NOT_FOUND]:             meta(3005, 'BAY_NOT_FOUND',             'Error',    false, 404, 'Session'),
  [OsppErrorCode.SESSION_NOT_FOUND]:         meta(3006, 'SESSION_NOT_FOUND',         'Error',    false, 404, 'Session'),
  [OsppErrorCode.SESSION_MISMATCH]:          meta(3007, 'SESSION_MISMATCH',          'Error',    false, 409, 'Session'),
  [OsppErrorCode.DURATION_INVALID]:          meta(3008, 'DURATION_INVALID',          'Error',    false, 422, 'Session'),
  [OsppErrorCode.HARDWARE_ACTIVATION_FAILED]: meta(3009, 'HARDWARE_ACTIVATION_FAILED', 'Error', false, 500, 'Session'),
  [OsppErrorCode.MAX_DURATION_EXCEEDED]:     meta(3010, 'MAX_DURATION_EXCEEDED',     'Warning',  false, 422, 'Session'),
  [OsppErrorCode.BAY_MAINTENANCE]:           meta(3011, 'BAY_MAINTENANCE',           'Warning',  true,  503, 'Session'),
  [OsppErrorCode.RESERVATION_NOT_FOUND]:     meta(3012, 'RESERVATION_NOT_FOUND',     'Error',    false, 404, 'Session'),
  [OsppErrorCode.RESERVATION_EXPIRED]:       meta(3013, 'RESERVATION_EXPIRED',       'Warning',  true,  410, 'Session'),
  [OsppErrorCode.BAY_RESERVED]:              meta(3014, 'BAY_RESERVED',              'Warning',  true,  409, 'Session'),
  [OsppErrorCode.PAYLOAD_INVALID]:           meta(3015, 'PAYLOAD_INVALID',           'Error',    false, 400, 'Session'),
  [OsppErrorCode.ACTIVE_SESSIONS_PRESENT]:   meta(3016, 'ACTIVE_SESSIONS_PRESENT',   'Warning',  true,  409, 'Session'),

  // ── Payment & Credit (4xxx) ───────────────────────────────────────────
  [OsppErrorCode.PAYMENT_GENERIC]:           meta(4000, 'PAYMENT_GENERIC',           'Error',    true,  500, 'Payment'),
  [OsppErrorCode.INSUFFICIENT_BALANCE]:      meta(4001, 'INSUFFICIENT_BALANCE',      'Warning',  true,  402, 'Payment'),
  [OsppErrorCode.OFFLINE_LIMIT_EXCEEDED]:    meta(4002, 'OFFLINE_LIMIT_EXCEEDED',    'Error',    false, 403, 'Payment'),
  [OsppErrorCode.OFFLINE_RATE_LIMITED]:      meta(4003, 'OFFLINE_RATE_LIMITED',       'Warning',  true,  429, 'Payment'),
  [OsppErrorCode.OFFLINE_PER_TX_EXCEEDED]:   meta(4004, 'OFFLINE_PER_TX_EXCEEDED',   'Error',    false, 403, 'Payment'),
  [OsppErrorCode.PAYMENT_FAILED]:            meta(4005, 'PAYMENT_FAILED',            'Error',    true,  402, 'Payment'),
  [OsppErrorCode.PAYMENT_TIMEOUT]:           meta(4006, 'PAYMENT_TIMEOUT',           'Warning',  true,  504, 'Payment'),
  [OsppErrorCode.REFUND_FAILED]:             meta(4007, 'REFUND_FAILED',             'Error',    true,  500, 'Payment'),
  [OsppErrorCode.WEBHOOK_SIGNATURE_INVALID]: meta(4008, 'WEBHOOK_SIGNATURE_INVALID', 'Critical', false, 401, 'Payment'),
  [OsppErrorCode.CSR_INVALID]:               meta(4010, 'CSR_INVALID',               'Error',    true,  400, 'Payment'),
  [OsppErrorCode.CERTIFICATE_CHAIN_INVALID]: meta(4011, 'CERTIFICATE_CHAIN_INVALID', 'Error',    true,  400, 'Payment'),
  [OsppErrorCode.CERTIFICATE_TYPE_MISMATCH]: meta(4012, 'CERTIFICATE_TYPE_MISMATCH', 'Warning',  true,  422, 'Payment'),
  [OsppErrorCode.RENEWAL_DENIED]:            meta(4013, 'RENEWAL_DENIED',            'Error',    false, 403, 'Payment'),
  [OsppErrorCode.KEYPAIR_GENERATION_FAILED]: meta(4014, 'KEYPAIR_GENERATION_FAILED', 'Critical', false, 500, 'Payment'),

  // ── Station Hardware (5.0xx) ──────────────────────────────────────────
  [OsppErrorCode.HARDWARE_GENERIC]:          meta(5000, 'HARDWARE_GENERIC',          'Warning',  true,  500, 'Hardware'),
  [OsppErrorCode.PUMP_SYSTEM]:               meta(5001, 'PUMP_SYSTEM',               'Critical', false, 500, 'Hardware'),
  [OsppErrorCode.FLUID_SYSTEM]:              meta(5002, 'FLUID_SYSTEM',              'Warning',  true,  500, 'Hardware'),
  [OsppErrorCode.CONSUMABLE_SYSTEM]:         meta(5003, 'CONSUMABLE_SYSTEM',         'Warning',  true,  500, 'Hardware'),
  [OsppErrorCode.ELECTRICAL_SYSTEM]:         meta(5004, 'ELECTRICAL_SYSTEM',         'Critical', true,  500, 'Hardware'),
  [OsppErrorCode.PAYMENT_HARDWARE]:          meta(5005, 'PAYMENT_HARDWARE',          'Warning',  false, 500, 'Hardware'),
  [OsppErrorCode.HEATING_SYSTEM]:            meta(5006, 'HEATING_SYSTEM',            'Warning',  true,  500, 'Hardware'),
  [OsppErrorCode.MECHANICAL_SYSTEM]:         meta(5007, 'MECHANICAL_SYSTEM',         'Warning',  false, 500, 'Hardware'),
  [OsppErrorCode.SENSOR_FAILURE]:            meta(5008, 'SENSOR_FAILURE',            'Warning',  true,  500, 'Hardware'),
  [OsppErrorCode.EMERGENCY_STOP]:            meta(5009, 'EMERGENCY_STOP',            'Critical', false, 500, 'Hardware'),

  // ── Firmware Update (5.01x) ───────────────────────────────────────────
  [OsppErrorCode.DOWNLOAD_FAILED]:           meta(5014, 'DOWNLOAD_FAILED',           'Error',    true,  502, 'Hardware'),
  [OsppErrorCode.CHECKSUM_MISMATCH]:         meta(5015, 'CHECKSUM_MISMATCH',         'Error',    false, 500, 'Hardware'),
  [OsppErrorCode.VERSION_ALREADY_INSTALLED]: meta(5016, 'VERSION_ALREADY_INSTALLED', 'Warning',  false, 409, 'Hardware'),
  [OsppErrorCode.INSUFFICIENT_STORAGE]:      meta(5017, 'INSUFFICIENT_STORAGE',      'Error',    false, 507, 'Hardware'),
  [OsppErrorCode.INSTALLATION_FAILED]:       meta(5018, 'INSTALLATION_FAILED',       'Critical', false, 500, 'Hardware'),

  // ── Diagnostics & Catalog (5.02x) ────────────────────────────────────
  [OsppErrorCode.UPLOAD_FAILED]:             meta(5019, 'UPLOAD_FAILED',             'Error',    true,  502, 'Hardware'),
  [OsppErrorCode.INVALID_TIME_WINDOW]:       meta(5020, 'INVALID_TIME_WINDOW',       'Warning',  false, 422, 'Hardware'),
  [OsppErrorCode.NO_DIAGNOSTICS_AVAILABLE]:  meta(5021, 'NO_DIAGNOSTICS_AVAILABLE',  'Warning',  false, 404, 'Hardware'),
  [OsppErrorCode.INVALID_CATALOG]:           meta(5023, 'INVALID_CATALOG',           'Error',    false, 422, 'Hardware'),
  [OsppErrorCode.UNSUPPORTED_SERVICE]:       meta(5024, 'UNSUPPORTED_SERVICE',       'Warning',  false, 422, 'Hardware'),
  [OsppErrorCode.CATALOG_TOO_LARGE]:         meta(5025, 'CATALOG_TOO_LARGE',         'Error',    false, 413, 'Hardware'),

  // ── Station Software (5.1xx) ──────────────────────────────────────────
  [OsppErrorCode.SOFTWARE_GENERIC]:          meta(5100, 'SOFTWARE_GENERIC',          'Error',    true,  500, 'Hardware'),
  [OsppErrorCode.FIRMWARE_ERROR]:            meta(5101, 'FIRMWARE_ERROR',            'Critical', false, 500, 'Hardware'),
  [OsppErrorCode.CONFIGURATION_ERROR]:       meta(5102, 'CONFIGURATION_ERROR',       'Error',    true,  500, 'Hardware'),
  [OsppErrorCode.STORAGE_ERROR]:             meta(5103, 'STORAGE_ERROR',             'Error',    true,  500, 'Hardware'),
  [OsppErrorCode.WATCHDOG_RESET]:            meta(5104, 'WATCHDOG_RESET',            'Critical', true,  500, 'Hardware'),
  [OsppErrorCode.MEMORY_ERROR]:              meta(5105, 'MEMORY_ERROR',              'Critical', true,  500, 'Hardware'),
  [OsppErrorCode.CLOCK_ERROR]:               meta(5106, 'CLOCK_ERROR',               'Warning',  true,  500, 'Hardware'),
  [OsppErrorCode.OPERATION_IN_PROGRESS]:     meta(5107, 'OPERATION_IN_PROGRESS',     'Warning',  true,  409, 'Hardware'),
  [OsppErrorCode.CONFIGURATION_KEY_READONLY]: meta(5108, 'CONFIGURATION_KEY_READONLY', 'Error',  false, 403, 'Hardware'),
  [OsppErrorCode.INVALID_CONFIGURATION_VALUE]: meta(5109, 'INVALID_CONFIGURATION_VALUE', 'Error', false, 422, 'Hardware'),
  [OsppErrorCode.RESET_FAILED]:              meta(5110, 'RESET_FAILED',              'Critical', false, 500, 'Hardware'),
  [OsppErrorCode.BUFFER_FULL]:               meta(5111, 'BUFFER_FULL',               'Critical', true,  503, 'Hardware'),
  [OsppErrorCode.FIRMWARE_SIGNATURE_INVALID]: meta(5112, 'FIRMWARE_SIGNATURE_INVALID', 'Critical', false, 500, 'Hardware'),

  // ── Server (6xxx) ─────────────────────────────────────────────────────
  [OsppErrorCode.SERVER_GENERIC]:            meta(6000, 'SERVER_GENERIC',            'Error',    true,  500, 'Server'),
  [OsppErrorCode.SERVER_INTERNAL_ERROR]:     meta(6001, 'SERVER_INTERNAL_ERROR',     'Error',    true,  500, 'Server'),
  [OsppErrorCode.ACK_TIMEOUT]:              meta(6002, 'ACK_TIMEOUT',               'Warning',  true,  504, 'Server'),
  [OsppErrorCode.STATION_OFFLINE]:           meta(6003, 'STATION_OFFLINE',           'Warning',  true,  502, 'Server'),
  [OsppErrorCode.VALIDATION_ERROR]:          meta(6004, 'VALIDATION_ERROR',          'Error',    false, 400, 'Server'),
  [OsppErrorCode.SESSION_ALREADY_ACTIVE]:    meta(6005, 'SESSION_ALREADY_ACTIVE',    'Warning',  true,  409, 'Server'),
  [OsppErrorCode.RATE_LIMIT_EXCEEDED]:       meta(6006, 'RATE_LIMIT_EXCEEDED',       'Warning',  true,  429, 'Server'),
  [OsppErrorCode.SERVICE_DEGRADED]:          meta(6007, 'SERVICE_DEGRADED',          'Info',     true,  503, 'Server'),
};
