import type { StationId, Timestamp, NetworkInfo, StationCapabilities } from '../common';
import { BootReason } from '../../enums/BootReason';

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
      supportedVersions?: string[];
    })
  | (BootNotificationResponseBase & {
      status: 'Pending';
      retryInterval: number;
      configuration?: Record<string, string>;
    });
