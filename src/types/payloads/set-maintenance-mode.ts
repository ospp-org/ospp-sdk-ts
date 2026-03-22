import type { BayId } from '../common';

/** SetMaintenanceMode REQUEST — Server → Station. */
export interface SetMaintenanceModeRequest {
  bayId?: BayId;
  enabled: boolean;
  reason?: string;
}

/** SetMaintenanceMode RESPONSE — Station → Server (discriminated union). */
export type SetMaintenanceModeResponse =
  | { status: 'Accepted' }
  | { status: 'Rejected'; errorCode: number; errorText: string };
