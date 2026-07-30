import type { BayId, ServiceId } from '../common.js';
import type { ReportableBayStatus } from '../../enums/BayStatus.js';

/** Service availability within a StatusNotification. */
export interface BayServiceStatus {
  serviceId: ServiceId;
  available: boolean;
}

/** StatusNotification EVENT — Station → Server. */
export interface StatusNotificationPayload {
  bayId: BayId;
  bayNumber: number;
  status: ReportableBayStatus;
  /**
   * Omitted on the post-boot report — the state left there is `Unknown`, which this
   * field cannot carry (status-notification.md §5 rule 2). Its absence therefore marks
   * a message as the boot report.
   */
  previousStatus?: ReportableBayStatus;
  services: BayServiceStatus[];
  errorCode?: number;
  errorText?: string;
}
