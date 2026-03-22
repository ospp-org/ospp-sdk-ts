import type { SessionId, BayId, CreditAmount, MeterValues } from '../common';

/** StopService REQUEST — Server → Station. */
export interface StopServiceRequest {
  sessionId: SessionId;
  bayId: BayId;
}

/** StopService RESPONSE — Station → Server (discriminated union). */
export type StopServiceResponse =
  | {
      status: 'Accepted';
      actualDurationSeconds: number;
      creditsCharged: CreditAmount;
      meterValues?: MeterValues;
    }
  | {
      status: 'Rejected';
      errorCode: number;
      errorText: string;
    };
