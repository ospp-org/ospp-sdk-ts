import type { BayId, ReservationId, Timestamp, SessionSource } from '../common';

/** ReserveBay REQUEST — Server → Station. */
export interface ReserveBayRequest {
  bayId: BayId;
  reservationId: ReservationId;
  expirationTime: Timestamp;
  sessionSource: SessionSource;
}

/** ReserveBay RESPONSE — Station → Server (discriminated union). */
export type ReserveBayResponse =
  | { status: 'Accepted' }
  | { status: 'Rejected'; errorCode: number; errorText: string };
