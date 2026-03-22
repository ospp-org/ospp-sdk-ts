/**
 * All 41 standard OSPP configuration keys.
 *
 * Source: spec/08-configuration.md §9 — Configuration Key Summary.
 *
 * Keys are PascalCase strings stored in a flat key-value store on the station.
 * Values are transmitted as JSON strings on the wire regardless of logical type.
 *
 * Profiles:
 *   Core           (12 keys) — required
 *   Transaction     (6 keys) — required
 *   Security        (7 keys) — required
 *   Offline / BLE  (12 keys) — required if capabilities.bleSupported = true
 *   Device Mgmt     (4 keys) — required
 */

// ---------------------------------------------------------------------------
// Metadata types
// ---------------------------------------------------------------------------

export type ConfigAccess = 'RW' | 'R' | 'W';
export type ConfigMutability = 'Dynamic' | 'Static';
export type ConfigProfile = 'Core' | 'Transaction' | 'Security' | 'OfflineBLE' | 'DeviceMgmt';
export type ConfigValueType = 'string' | 'integer' | 'boolean' | 'decimal' | 'CSV';

export interface ConfigKeyMeta {
  key: string;
  valueType: ConfigValueType;
  defaultValue: string | null;
  access: ConfigAccess;
  mutability: ConfigMutability;
  profile: ConfigProfile;
}

// ---------------------------------------------------------------------------
// Enum — PascalCase key names
// ---------------------------------------------------------------------------

export enum ConfigKey {
  // --- Core (12) ---
  HEARTBEAT_INTERVAL_SECONDS    = 'HeartbeatIntervalSeconds',
  CONNECTION_TIMEOUT            = 'ConnectionTimeout',
  RECONNECT_BACKOFF_MAX         = 'ReconnectBackoffMax',
  STATION_NAME                  = 'StationName',
  TIME_ZONE                     = 'TimeZone',
  PROTOCOL_VERSION              = 'ProtocolVersion',
  FIRMWARE_VERSION              = 'FirmwareVersion',
  BOOT_RETRY_INTERVAL           = 'BootRetryInterval',
  STATUS_NOTIFICATION_INTERVAL  = 'StatusNotificationInterval',
  EVENT_THROTTLE_SECONDS        = 'EventThrottleSeconds',
  CONNECTION_LOST_GRACE_PERIOD  = 'ConnectionLostGracePeriod',
  LOCALE                        = 'Locale',

  // --- Transaction (6) ---
  METER_VALUES_INTERVAL         = 'MeterValuesInterval',
  METER_VALUES_SAMPLE_INTERVAL  = 'MeterValuesSampleInterval',
  MAX_SESSION_DURATION_SECONDS  = 'MaxSessionDurationSeconds',
  SESSION_TIMEOUT               = 'SessionTimeout',
  RESERVATION_DEFAULT_TTL       = 'ReservationDefaultTTL',
  DEFAULT_CREDITS_PER_SESSION   = 'DefaultCreditsPerSession',

  // --- Security (7) ---
  SECURITY_PROFILE              = 'SecurityProfile',
  CERTIFICATE_SERIAL_NUMBER     = 'CertificateSerialNumber',
  AUTHORIZATION_CACHE_ENABLED   = 'AuthorizationCacheEnabled',
  MESSAGE_SIGNING_MODE          = 'MessageSigningMode',
  OFFLINE_PASS_PUBLIC_KEY       = 'OfflinePassPublicKey',
  CERTIFICATE_RENEWAL_THRESHOLD_DAYS = 'CertificateRenewalThresholdDays',
  CERTIFICATE_RENEWAL_ENABLED   = 'CertificateRenewalEnabled',

  // --- Offline / BLE (12) ---
  OFFLINE_MODE_ENABLED          = 'OfflineModeEnabled',
  MAX_OFFLINE_TRANSACTIONS      = 'MaxOfflineTransactions',
  OFFLINE_PASS_MAX_AGE          = 'OfflinePassMaxAge',
  BLE_ADVERTISING_ENABLED       = 'BLEAdvertisingEnabled',
  MAX_CONCURRENT_BLE_CONNECTIONS = 'MaxConcurrentBLEConnections',
  BLE_ADVERTISING_INTERVAL      = 'BLEAdvertisingInterval',
  BLE_TX_POWER                  = 'BLETxPower',
  BLE_CONNECTION_TIMEOUT        = 'BLEConnectionTimeout',
  BLE_MTU_PREFERRED             = 'BLEMTUPreferred',
  BLE_STATUS_INTERVAL           = 'BLEStatusInterval',
  REVOCATION_EPOCH              = 'RevocationEpoch',
  BLE_MAX_RETRIES               = 'BLEMaxRetries',

  // --- Device Management (4) ---
  FIRMWARE_UPDATE_ENABLED       = 'FirmwareUpdateEnabled',
  DIAGNOSTICS_UPLOAD_URL        = 'DiagnosticsUploadUrl',
  LOG_LEVEL                     = 'LogLevel',
  AUTO_REBOOT_ENABLED           = 'AutoRebootEnabled',
}

// ---------------------------------------------------------------------------
// Registry — static metadata per config key
// ---------------------------------------------------------------------------

function km(
  key: string,
  valueType: ConfigValueType,
  defaultValue: string | null,
  access: ConfigAccess,
  mutability: ConfigMutability,
  profile: ConfigProfile,
): ConfigKeyMeta {
  return { key, valueType, defaultValue, access, mutability, profile };
}

export const CONFIG_KEY_REGISTRY: Readonly<Record<ConfigKey, ConfigKeyMeta>> = {
  // ── Core ──────────────────────────────────────────────────────────────
  [ConfigKey.HEARTBEAT_INTERVAL_SECONDS]:   km('HeartbeatIntervalSeconds',   'integer', '30',    'RW', 'Dynamic', 'Core'),
  [ConfigKey.CONNECTION_TIMEOUT]:           km('ConnectionTimeout',           'integer', '60',    'RW', 'Dynamic', 'Core'),
  [ConfigKey.RECONNECT_BACKOFF_MAX]:        km('ReconnectBackoffMax',         'integer', '30',    'RW', 'Dynamic', 'Core'),
  [ConfigKey.STATION_NAME]:                 km('StationName',                 'string',  '',      'RW', 'Static',  'Core'),
  [ConfigKey.TIME_ZONE]:                    km('TimeZone',                    'string',  'UTC',   'RW', 'Static',  'Core'),
  [ConfigKey.PROTOCOL_VERSION]:             km('ProtocolVersion',             'string',  '0.2.1', 'R',  'Static',  'Core'),
  [ConfigKey.FIRMWARE_VERSION]:             km('FirmwareVersion',             'string',  null,    'R',  'Static',  'Core'),
  [ConfigKey.BOOT_RETRY_INTERVAL]:          km('BootRetryInterval',           'integer', '30',    'RW', 'Dynamic', 'Core'),
  [ConfigKey.STATUS_NOTIFICATION_INTERVAL]: km('StatusNotificationInterval',  'integer', '0',     'RW', 'Dynamic', 'Core'),
  [ConfigKey.EVENT_THROTTLE_SECONDS]:       km('EventThrottleSeconds',        'integer', '0',     'RW', 'Dynamic', 'Core'),
  [ConfigKey.CONNECTION_LOST_GRACE_PERIOD]: km('ConnectionLostGracePeriod',   'integer', '300',   'RW', 'Dynamic', 'Core'),
  [ConfigKey.LOCALE]:                       km('Locale',                      'string',  'en-US', 'RW', 'Dynamic', 'Core'),

  // ── Transaction ───────────────────────────────────────────────────────
  [ConfigKey.METER_VALUES_INTERVAL]:        km('MeterValuesInterval',         'integer', '15',    'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.METER_VALUES_SAMPLE_INTERVAL]: km('MeterValuesSampleInterval',   'integer', '10',    'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.MAX_SESSION_DURATION_SECONDS]: km('MaxSessionDurationSeconds',   'integer', '600',   'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.SESSION_TIMEOUT]:              km('SessionTimeout',              'integer', '120',   'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.RESERVATION_DEFAULT_TTL]:      km('ReservationDefaultTTL',       'integer', '180',   'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.DEFAULT_CREDITS_PER_SESSION]:  km('DefaultCreditsPerSession',    'integer', '100',   'RW', 'Dynamic', 'Transaction'),

  // ── Security ──────────────────────────────────────────────────────────
  [ConfigKey.SECURITY_PROFILE]:             km('SecurityProfile',             'integer', '2',     'RW', 'Static',  'Security'),
  [ConfigKey.CERTIFICATE_SERIAL_NUMBER]:    km('CertificateSerialNumber',     'string',  null,    'R',  'Static',  'Security'),
  [ConfigKey.AUTHORIZATION_CACHE_ENABLED]:  km('AuthorizationCacheEnabled',   'boolean', 'true',  'RW', 'Dynamic', 'Security'),
  [ConfigKey.MESSAGE_SIGNING_MODE]:         km('MessageSigningMode',          'string',  'Critical', 'RW', 'Dynamic', 'Security'),
  [ConfigKey.OFFLINE_PASS_PUBLIC_KEY]:      km('OfflinePassPublicKey',        'string',  null,    'W',  'Dynamic', 'Security'),
  [ConfigKey.CERTIFICATE_RENEWAL_THRESHOLD_DAYS]: km('CertificateRenewalThresholdDays', 'integer', '30', 'RW', 'Dynamic', 'Security'),
  [ConfigKey.CERTIFICATE_RENEWAL_ENABLED]:  km('CertificateRenewalEnabled',   'boolean', 'true',  'RW', 'Dynamic', 'Security'),

  // ── Offline / BLE ─────────────────────────────────────────────────────
  [ConfigKey.OFFLINE_MODE_ENABLED]:         km('OfflineModeEnabled',          'boolean', 'true',  'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.MAX_OFFLINE_TRANSACTIONS]:     km('MaxOfflineTransactions',      'integer', '50',    'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.OFFLINE_PASS_MAX_AGE]:         km('OfflinePassMaxAge',           'integer', '3600',  'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.BLE_ADVERTISING_ENABLED]:      km('BLEAdvertisingEnabled',       'boolean', 'true',  'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.MAX_CONCURRENT_BLE_CONNECTIONS]: km('MaxConcurrentBLEConnections', 'integer', '1',   'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.BLE_ADVERTISING_INTERVAL]:     km('BLEAdvertisingInterval',      'integer', '200',   'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.BLE_TX_POWER]:                 km('BLETxPower',                  'integer', '4',     'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.BLE_CONNECTION_TIMEOUT]:       km('BLEConnectionTimeout',        'integer', '30',    'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.BLE_MTU_PREFERRED]:            km('BLEMTUPreferred',             'integer', '247',   'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.BLE_STATUS_INTERVAL]:          km('BLEStatusInterval',           'integer', '5',     'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.REVOCATION_EPOCH]:             km('RevocationEpoch',             'integer', '0',     'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.BLE_MAX_RETRIES]:              km('BLEMaxRetries',               'integer', '3',     'RW', 'Dynamic', 'OfflineBLE'),

  // ── Device Management ─────────────────────────────────────────────────
  [ConfigKey.FIRMWARE_UPDATE_ENABLED]:      km('FirmwareUpdateEnabled',       'boolean', 'true',  'RW', 'Dynamic', 'DeviceMgmt'),
  [ConfigKey.DIAGNOSTICS_UPLOAD_URL]:       km('DiagnosticsUploadUrl',        'string',  '',      'RW', 'Static',  'DeviceMgmt'),
  [ConfigKey.LOG_LEVEL]:                    km('LogLevel',                    'string',  'Info',  'RW', 'Dynamic', 'DeviceMgmt'),
  [ConfigKey.AUTO_REBOOT_ENABLED]:          km('AutoRebootEnabled',           'boolean', 'false', 'RW', 'Dynamic', 'DeviceMgmt'),
};
