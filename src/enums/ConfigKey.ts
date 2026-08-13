/**
 * All 29 standard OSPP configuration keys.
 *
 * Source: spec/08-configuration.md §§2--6 — the registry tables.
 *
 * §9 is a DERIVED cross-reference and is NOT the source: spec v0.16.0 declares
 * §§2--6 normative and §9 derived from them, and the two do not carry the same
 * columns. Reading §9 is what left this registry without a Range field and what
 * fed it the display label `Device Mgmt`, which §9 spelled two ways.
 *
 * Keys are PascalCase strings stored in a flat key-value store on the station.
 * Values are transmitted as JSON strings on the wire regardless of logical type.
 *
 * Profiles — the `profile` field below carries the §1.5 **Profile ID**, the
 * normative machine identifier, never the display label:
 *
 *   Profile ID         Display label       Keys   Required
 *   Core               Core                   9   yes
 *   Transaction        Transaction            6   yes
 *   Security           Security               6   yes
 *   OfflineBLE         Offline / BLE          4   if capabilities.bleSupported
 *   DeviceManagement   Device Management      4   if capabilities.deviceManagementSupported
 *
 * The display labels carry a space and a slash and do not survive being made an
 * identifier; that is why §1.5 states the ID column separately and requires it
 * exactly. `npm run check:config-registry` compares this registry to it.
 */

// ---------------------------------------------------------------------------
// Metadata types
// ---------------------------------------------------------------------------

export type ConfigAccess = 'RW' | 'R' | 'W';
export type ConfigMutability = 'Dynamic' | 'Static';
export type ConfigProfile =
  | 'Core'
  | 'Transaction'
  | 'Security'
  | 'OfflineBLE'
  | 'DeviceManagement';
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
  // --- Core (9) ---
  HEARTBEAT_INTERVAL_SECONDS    = 'HeartbeatIntervalSeconds',
  CONNECTION_TIMEOUT            = 'ConnectionTimeout',
  RECONNECT_BACKOFF_MAX         = 'ReconnectBackoffMax',
  STATION_NAME                  = 'StationName',
  TIME_ZONE                     = 'TimeZone',
  PROTOCOL_VERSION              = 'ProtocolVersion',
  FIRMWARE_VERSION              = 'FirmwareVersion',
  BOOT_RETRY_INTERVAL           = 'BootRetryInterval',
  CONNECTION_LOST_GRACE_PERIOD  = 'ConnectionLostGracePeriod',

  // --- Transaction (6) ---
  METER_VALUES_INTERVAL         = 'MeterValuesInterval',
  METER_VALUES_SAMPLE_INTERVAL  = 'MeterValuesSampleInterval',
  MAX_SESSION_DURATION_SECONDS  = 'MaxSessionDurationSeconds',
  SESSION_TIMEOUT               = 'SessionTimeout',
  RESERVATION_DEFAULT_TTL       = 'ReservationDefaultTTL',
  DEFAULT_CREDITS_PER_SESSION   = 'DefaultCreditsPerSession',

  // --- Security (6) ---
  CERTIFICATE_SERIAL_NUMBER     = 'CertificateSerialNumber',
  AUTHORIZATION_CACHE_ENABLED   = 'AuthorizationCacheEnabled',
  MESSAGE_SIGNING_MODE          = 'MessageSigningMode',
  OFFLINE_PASS_PUBLIC_KEY       = 'OfflinePassPublicKey',
  CERTIFICATE_RENEWAL_THRESHOLD_DAYS = 'CertificateRenewalThresholdDays',
  CERTIFICATE_RENEWAL_ENABLED   = 'CertificateRenewalEnabled',

  // --- Offline / BLE (4) ---
  OFFLINE_MODE_ENABLED          = 'OfflineModeEnabled',
  MAX_OFFLINE_TRANSACTIONS      = 'MaxOfflineTransactions',
  OFFLINE_PASS_MAX_AGE          = 'OfflinePassMaxAge',
  REVOCATION_EPOCH              = 'RevocationEpoch',

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
  [ConfigKey.PROTOCOL_VERSION]:             km('ProtocolVersion',             'string',  '0.3.0', 'R',  'Static',  'Core'),
  [ConfigKey.FIRMWARE_VERSION]:             km('FirmwareVersion',             'string',  null,    'R',  'Static',  'Core'),
  [ConfigKey.BOOT_RETRY_INTERVAL]:          km('BootRetryInterval',           'integer', '30',    'RW', 'Dynamic', 'Core'),
  [ConfigKey.CONNECTION_LOST_GRACE_PERIOD]: km('ConnectionLostGracePeriod',   'integer', '300',   'RW', 'Dynamic', 'Core'),

  // ── Transaction ───────────────────────────────────────────────────────
  [ConfigKey.METER_VALUES_INTERVAL]:        km('MeterValuesInterval',         'integer', '60',    'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.METER_VALUES_SAMPLE_INTERVAL]: km('MeterValuesSampleInterval',   'integer', '10',    'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.MAX_SESSION_DURATION_SECONDS]: km('MaxSessionDurationSeconds',   'integer', '900',   'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.SESSION_TIMEOUT]:              km('SessionTimeout',              'integer', '120',   'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.RESERVATION_DEFAULT_TTL]:      km('ReservationDefaultTTL',       'integer', '300',   'RW', 'Dynamic', 'Transaction'),
  [ConfigKey.DEFAULT_CREDITS_PER_SESSION]:  km('DefaultCreditsPerSession',    'integer', '100',   'RW', 'Dynamic', 'Transaction'),

  // ── Security ──────────────────────────────────────────────────────────
  [ConfigKey.CERTIFICATE_SERIAL_NUMBER]:    km('CertificateSerialNumber',     'string',  null,    'R',  'Static',  'Security'),
  [ConfigKey.AUTHORIZATION_CACHE_ENABLED]:  km('AuthorizationCacheEnabled',   'boolean', 'true',  'RW', 'Dynamic', 'Security'),
  [ConfigKey.MESSAGE_SIGNING_MODE]:         km('MessageSigningMode',          'string',  'All',      'RW', 'Static',  'Security'),
  [ConfigKey.OFFLINE_PASS_PUBLIC_KEY]:      km('OfflinePassPublicKey',        'string',  null,    'W',  'Dynamic', 'Security'),
  [ConfigKey.CERTIFICATE_RENEWAL_THRESHOLD_DAYS]: km('CertificateRenewalThresholdDays', 'integer', '30', 'RW', 'Dynamic', 'Security'),
  [ConfigKey.CERTIFICATE_RENEWAL_ENABLED]:  km('CertificateRenewalEnabled',   'boolean', 'true',  'RW', 'Dynamic', 'Security'),

  // ── Offline / BLE ─────────────────────────────────────────────────────
  [ConfigKey.OFFLINE_MODE_ENABLED]:         km('OfflineModeEnabled',          'boolean', 'true',  'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.MAX_OFFLINE_TRANSACTIONS]:     km('MaxOfflineTransactions',      'integer', '50',    'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.OFFLINE_PASS_MAX_AGE]:         km('OfflinePassMaxAge',           'integer', '3600',  'RW', 'Dynamic', 'OfflineBLE'),
  [ConfigKey.REVOCATION_EPOCH]:             km('RevocationEpoch',             'integer', '0',     'RW', 'Dynamic', 'OfflineBLE'),

  // ── Device Management ─────────────────────────────────────────────────
  [ConfigKey.FIRMWARE_UPDATE_ENABLED]:      km('FirmwareUpdateEnabled',       'boolean', 'true',  'RW', 'Dynamic', 'DeviceManagement'),
  [ConfigKey.DIAGNOSTICS_UPLOAD_URL]:       km('DiagnosticsUploadUrl',        'string',  '',      'RW', 'Static',  'DeviceManagement'),
  [ConfigKey.LOG_LEVEL]:                    km('LogLevel',                    'string',  'Info',  'RW', 'Dynamic', 'DeviceManagement'),
  [ConfigKey.AUTO_REBOOT_ENABLED]:          km('AutoRebootEnabled',           'boolean', 'false', 'RW', 'Dynamic', 'DeviceManagement'),
};
