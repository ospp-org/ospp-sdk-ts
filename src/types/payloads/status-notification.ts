import type { BayId, ServiceId } from '../common.js';
import { BayStatus } from '../../enums/BayStatus.js';

/** Service availability within a StatusNotification. */
export interface BayServiceStatus {
  serviceId: ServiceId;
  available: boolean;
}

/** StatusNotification EVENT — Station → Server. */
export interface StatusNotificationPayload {
  bayId: BayId;
  bayNumber: number;
  status: BayStatus;
  previousStatus?: BayStatus;
  services: BayServiceStatus[];
  errorCode?: number;
  errorText?: string;
}
