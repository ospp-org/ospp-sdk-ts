export type DiagnosticsNotificationStatus = 'Collecting' | 'Uploading' | 'Uploaded' | 'Failed';

/** DiagnosticsNotification EVENT — Station → Server. */
export interface DiagnosticsNotificationPayload {
  status: DiagnosticsNotificationStatus;
  progress?: number;
  fileName?: string;
  errorText?: string;
}
