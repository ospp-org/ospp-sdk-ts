import type { Timestamp } from '../common';

/** GetDiagnostics REQUEST — Server → Station. */
export interface GetDiagnosticsRequest {
  uploadUrl: string;
  startTime?: Timestamp;
  endTime?: Timestamp;
}

/** GetDiagnostics RESPONSE — Station → Server (discriminated union). */
export type GetDiagnosticsResponse =
  | { status: 'Accepted'; fileName: string }
  | { status: 'Rejected'; errorCode: number; errorText: string };
