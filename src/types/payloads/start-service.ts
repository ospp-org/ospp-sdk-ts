import type { SessionId, BayId, ServiceId, ReservationId, SessionSource } from '../common';

/** StartService REQUEST — Server → Station. */
export interface StartServiceRequest {
  sessionId: SessionId;
  bayId: BayId;
  serviceId: ServiceId;
  durationSeconds: number;
  sessionSource: SessionSource;
  reservationId?: ReservationId;
  params?: Record<string, unknown>;
}

/** StartService RESPONSE — Station → Server (discriminated union). */
export type StartServiceResponse =
  | { status: 'Accepted' }
  | { status: 'Rejected'; errorCode: number; errorText: string };
