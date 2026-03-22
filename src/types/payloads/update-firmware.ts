import type { Timestamp } from '../common';

/** UpdateFirmware REQUEST — Server → Station. */
export interface UpdateFirmwareRequest {
  firmwareUrl: string;
  firmwareVersion: string;
  checksum: string;
  signature: string;
  forceDowngrade?: boolean;
  scheduledAt?: Timestamp;
}

/** UpdateFirmware RESPONSE — Station → Server (discriminated union). */
export type UpdateFirmwareResponse =
  | { status: 'Accepted' }
  | { status: 'Rejected'; errorCode: number; errorText: string };
