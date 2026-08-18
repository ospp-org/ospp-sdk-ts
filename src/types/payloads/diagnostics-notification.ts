import type { DiagnosticsNotificationStatus } from '../../state-machines/DiagnosticsStateMachine.js';

export type { DiagnosticsNotificationStatus };

/** DiagnosticsNotification EVENT — Station → Server. */
export interface DiagnosticsNotificationPayload {
  status: DiagnosticsNotificationStatus;
  progress?: number;
  fileName?: string;
  errorText?: string;
}
