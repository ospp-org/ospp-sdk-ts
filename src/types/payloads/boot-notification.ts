import type { StationId, Timestamp, NetworkInfo, StationCapabilities } from '../common.js';
import type { BayTopology } from '../topology.js';
import { BootReason } from '../../enums/BootReason.js';

/** BootNotification REQUEST — Station → Server. */
export interface BootNotificationRequest {
  stationId: StationId;
  firmwareVersion: string;
  stationModel: string;
  stationVendor: string;
  serialNumber: string;
  /**
   * The station's RE-DECLARED PHYSICAL TOPOLOGY — the same bays and program
   * ordinals it declared at provisioning, restated on every boot so the server
   * can detect that the two no longer agree. Labels are NOT re-declared and are
   * NOT compared.
   *
   * The declaration MUST be STABLE between boots while the hardware is
   * unchanged; how firmware achieves that is its own business, and the contract
   * is the stability, not the mechanism. A station MUST NOT alter it to match
   * what the server expected — the declaration describes hardware, and silently
   * agreeing would hide a real hardware change.
   *
   * A mismatch in either direction puts the station in `Pending` with
   * `3018 TOPOLOGY_MISMATCH`, NOT `Rejected`: `Pending` keeps the command
   * channel open so an operator can repair the disagreement.
   *
   * 1..64 entries.
   */
  bays: BayTopology[];
  uptimeSeconds: number;
  pendingOfflineTransactions: number;
  timezone: string;
  bootReason: BootReason;
  capabilities: StationCapabilities;
  networkInfo: NetworkInfo;
}

/** Common fields present in every BootNotification RESPONSE variant. */
interface BootNotificationResponseBase {
  serverTime: Timestamp;
  heartbeatIntervalSec: number;
}

/**
 * What the server expected and what arrived, on a `3018 TOPOLOGY_MISMATCH`.
 *
 * Typed against the same BayTopology the request's `bays[]` uses -- one
 * definition instead of two copies.
 */
export interface BootTopologyMismatchDetails {
  /** The topology recorded for this station at provisioning. */
  expected: BayTopology[];
  /** The topology this BootNotification declared, echoed back. */
  declared: BayTopology[];
}

/** BootNotification RESPONSE — Server → Station (discriminated union). */
export type BootNotificationResponse =
  | (BootNotificationResponseBase & {
      status: 'Accepted';
      configuration?: Record<string, string>;
      sessionKey?: string;
    })
  | (BootNotificationResponseBase & {
      status: 'Rejected';
      retryInterval: number;
      // Required when status is Rejected: boot-notification-response.schema.json
      // makes `retryInterval`, `errorCode` and `errorText` a single `then.required`
      // group. They were absent here — not even optional — so the spec's own
      // Rejected vectors did not type-check. Same shape as every other Rejected
      // variant in the SDK (reserve-bay.ts:14).
      errorCode: number;
      errorText: string;
      supportedVersions?: string[];
    })
  | (BootNotificationResponseBase & {
      status: 'Pending';
      retryInterval: number;
      configuration?: Record<string, string>;
    });
