import type { OfflinePassId, OfflinePass, DeviceId, BayId, ServiceId, SessionId, CreditAmount } from '../common';

/** AuthorizeOfflinePass REQUEST — Station → Server. */
export interface AuthorizeOfflinePassRequest {
  offlinePassId: OfflinePassId;
  offlinePass: OfflinePass;
  deviceId: DeviceId;
  counter: number;
  bayId: BayId;
  serviceId: ServiceId;
}

/** AuthorizeOfflinePass RESPONSE — Server → Station (discriminated union). */
export type AuthorizeOfflinePassResponse =
  | {
      status: 'Accepted';
      sessionId: SessionId;
      durationSeconds: number;
      creditsAuthorized: CreditAmount;
    }
  | {
      status: 'Rejected';
      reason: string;
    };
