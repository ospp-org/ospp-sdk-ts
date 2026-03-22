import type { BayId, ServiceId } from '../common';
import { BayStatus } from '../../enums/BayStatus';

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
