import type { SessionId, BayId, CreditAmount, MeterValues } from '../common.js';

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
      /**
       * Optional canonical session-final marker — highest seqNo emitted for
       * this session by the station. Servers MUST discard any MeterValues
       * with seqNo > finalSeqNo received subsequently for the same sessionId.
       * See spec/02-transport.md §3.2.
       */
      finalSeqNo?: number;
    }
  | {
      status: 'Rejected';
      errorCode: number;
      errorText: string;
    };
