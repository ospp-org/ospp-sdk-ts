export type FirmwareNotificationStatus = 'Downloading' | 'Downloaded' | 'Installing' | 'Installed' | 'Failed';

/** FirmwareStatusNotification EVENT — Station → Server. */
export interface FirmwareStatusNotificationPayload {
  status: FirmwareNotificationStatus;
  firmwareVersion: string;
  progress?: number;
  errorText?: string;
}
