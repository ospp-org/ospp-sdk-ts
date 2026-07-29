import type { StationId, Timestamp, NetworkInfo, StationCapabilities } from '../common.js';
import { BootReason } from '../../enums/BootReason.js';

/** BootNotification REQUEST — Station → Server. */
export interface BootNotificationRequest {
  stationId: StationId;
  firmwareVersion: string;
  stationModel: string;
  stationVendor: string;
  serialNumber: string;
  bayCount: number;
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
