/**
 * Common types reused across multiple OSPP message payloads.
 *
 * Sources:
 *   spec/schemas/common/*.schema.json
 *   spec/03-messages.md — shared field definitions
 */

// ---------------------------------------------------------------------------
// Branded ID types
// ---------------------------------------------------------------------------
// These are plain strings at runtime. The doc comments record the pattern
// from the JSON Schema so callers know the expected format.

/** Station identifier. Pattern: `^stn_[a-f0-9]{8,}$` (12-64 chars). */
export type StationId = string;

/** Session identifier. Pattern: `^sess_[a-f0-9]{8,}$` (13-64 chars). */
export type SessionId = string;

/** Bay identifier. Pattern: `^bay_[a-f0-9]{8,}$` (12-64 chars). */
export type BayId = string;

/** Reservation identifier. Pattern: `^rsv_[a-f0-9]{8,}$` (12-64 chars). */
export type ReservationId = string;

/** Service identifier. Pattern: `^svc_[a-z0-9_]+$` (5-64 chars). */
export type ServiceId = string;

/** Offline pass identifier. Pattern: `^opass_[a-f0-9]{8,}$` (14-64 chars). */
export type OfflinePassId = string;

/** Offline transaction identifier. Pattern: `^otx_[a-f0-9]{8,}$` (12-64 chars). */
export type OfflineTxId = string;

/** User identifier (OIDC subject). Pattern: `^sub_[a-zA-Z0-9]+$` (5-64 chars). */
export type UserId = string;

/** Device identifier. Any string (1-64 chars). */
export type DeviceId = string;

/**
 * ISO 8601 UTC timestamp with millisecond precision.
 * Pattern: `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$`
 * Example: `"2026-01-30T12:00:00.000Z"`
 */
export type Timestamp = string;

/** Credit amount in atomic units (integer >= 0, no floating point). */
export type CreditAmount = number;

// ---------------------------------------------------------------------------
// Meter Values
// ---------------------------------------------------------------------------
// Source: spec/schemas/common/meter-values.schema.json

/** Resource consumption readings. All fields are cumulative since session start. */
export interface MeterValues {
  /** Liquid consumption in milliliters (>= 0). */
  liquidMl?: number;
  /** Consumable material usage in milliliters (>= 0). */
  consumableMl?: number;
  /** Energy consumption in watt-hours (>= 0). */
  energyWh?: number;
}

// ---------------------------------------------------------------------------
// Receipt
// ---------------------------------------------------------------------------
// Source: spec/schemas/common/receipt.schema.json

/** Cryptographically signed receipt proving a completed service transaction. */
export interface Receipt {
  /** Base64-encoded canonical JSON of receipt data. */
  data: string;
  /** Base64-encoded ECDSA P-256 signature. */
  signature: string;
  /** Signature algorithm — always 'ECDSA-P256-SHA256'. */
  signatureAlgorithm: 'ECDSA-P256-SHA256';
}

// ---------------------------------------------------------------------------
// Service Item
// ---------------------------------------------------------------------------
// Source: spec/schemas/common/service-item.schema.json

/** Pricing model for a service. */
export type PricingType = 'PerMinute' | 'Fixed';

/** A service entry in the station's service catalog. */
export interface ServiceItem {
  /** Service identifier (svc_*). */
  serviceId: ServiceId;
  /** Human-readable name (1-128 chars). */
  serviceName: string;
  /** How this service is priced. */
  pricingType: PricingType;
  /** Price in credits per minute (when pricingType is PerMinute, >= 1). */
  priceCreditsPerMinute?: number;
  /** Fixed price in credits (when pricingType is Fixed, >= 1). */
  priceCreditsFixed?: number;
  /** Local-currency minor units per minute (informational, >= 0). */
  priceLocalPerMinute?: number;
  /** Local-currency minor units fixed (informational, >= 0). */
  priceLocalFixed?: number;
  /** Whether this service is currently available. */
  available: boolean;
}

// ---------------------------------------------------------------------------
// Offline Pass
// ---------------------------------------------------------------------------
// Source: spec/schemas/common/offline-pass.schema.json

/** Spending and usage limits for an offline pass. */
export interface OfflineAllowance {
  /** Maximum total credits spendable across all offline transactions (>= 1). */
  maxTotalCredits: number;
  /** Maximum number of offline transactions allowed (>= 1). */
  maxUses: number;
  /** Maximum credits per single offline transaction (>= 1). */
  maxCreditsPerTx: number;
  /** Service types permitted for offline use (>= 1 entry). */
  allowedServiceTypes: ServiceId[];
}

/** Operational constraints for offline sessions. */
export interface OfflineConstraints {
  /** Minimum interval in seconds between consecutive offline transactions (>= 0). */
  minIntervalSec: number;
  /** Maximum hours a station can operate in offline mode (>= 1). */
  stationOfflineWindowHours: number;
  /** Maximum offline transactions a station accepts before requiring sync (>= 1). */
  stationMaxOfflineTx: number;
}

/** Server-signed credential authorizing offline service usage. */
export interface OfflinePass {
  /** Offline pass identifier (opass_*). */
  passId: OfflinePassId;
  /** User subject identifier (sub_*). */
  sub: UserId;
  /** Device this pass is bound to. */
  deviceId: DeviceId;
  /** When this pass was issued (ISO 8601 UTC). */
  issuedAt: Timestamp;
  /** When this pass expires (ISO 8601 UTC, max 24h from issuance). */
  expiresAt: Timestamp;
  /** Version of the offline policy used to generate this pass (>= 1). */
  policyVersion: number;
  /** Revocation epoch; stations reject passes with epoch lower than stored minimum (>= 0). */
  revocationEpoch: number;
  /** Spending and usage limits. */
  offlineAllowance: OfflineAllowance;
  /** Operational constraints. */
  constraints: OfflineConstraints;
  /** Signature algorithm — always 'ECDSA-P256-SHA256'. */
  signatureAlgorithm: 'ECDSA-P256-SHA256';
  /** Base64-encoded ECDSA P-256 signature over the pass fields. */
  signature: string;
}

// ---------------------------------------------------------------------------
// Session Source
// ---------------------------------------------------------------------------
// Source: spec/03-messages.md §3.3 StartService

/** How the session was initiated. */
export type SessionSource = 'MobileApp' | 'WebPayment';

// ---------------------------------------------------------------------------
// Network Info
// ---------------------------------------------------------------------------
// Source: spec/03-messages.md §1.1 BootNotification

/** Network connection type. */
export type ConnectionType = 'Ethernet' | 'Wifi' | 'Cellular';

/** Network connection info reported in BootNotification. */
export interface NetworkInfo {
  /** Connection type. */
  connectionType: ConnectionType;
  /** Signal strength in dBm (null/omitted for Ethernet). */
  signalStrength?: number;
}

// ---------------------------------------------------------------------------
// Station Capabilities
// ---------------------------------------------------------------------------
// Source: spec/03-messages.md §1.1 BootNotification

/** Station capabilities reported in BootNotification. */
export interface StationCapabilities {
  /** BLE hardware available and enabled. */
  bleSupported: boolean;
  /** Station can handle offline sessions. */
  offlineModeSupported: boolean;
  /** Station has consumption sensors. */
  meterValuesSupported: boolean;
  /** Station supports the Device Management profile. */
  deviceManagementSupported?: boolean;
}
