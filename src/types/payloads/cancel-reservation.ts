import type { BayId, ReservationId } from '../common';

/** CancelReservation REQUEST — Server → Station. */
export interface CancelReservationRequest {
  bayId: BayId;
  reservationId: ReservationId;
}

/** CancelReservation RESPONSE — Station → Server (discriminated union). */
export type CancelReservationResponse =
  | { status: 'Accepted' }
  | { status: 'Rejected'; errorCode: number; errorText: string };
