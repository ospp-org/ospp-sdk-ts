import type { SessionId, BayId, ServiceId, ReservationId, SessionSource } from '../common.js';

/** StartService REQUEST — Server → Station. */
export interface StartServiceRequest {
  sessionId: SessionId;
  bayId: BayId;
  /**
   * The CATALOG SERVICE — the commercial offering the customer paid for, minted
   * by the server. Not the station's physical program: that is `programNumber`.
   * One program MAY carry several services (the same hardware sold at a
   * promotional rate and a standard rate), so the two are not interchangeable,
   * and the receipt names the serviceId — never the program — so the price
   * actually paid stays identifiable.
   */
  serviceId: ServiceId;
  /**
   * The ordinal of the PHYSICAL PROGRAM to run on the target bay, as the
   * station declared it at provisioning. 1..32.
   *
   * Carried explicitly so the station acts on a field rather than indexing its
   * own catalog by serviceId, and so a service minted since the last catalog
   * push still starts. The station MUST verify the ordinal was declared for
   * that bay and, if it was not, MUST reject with 3017 PROGRAM_NOT_DECLARED --
   * never accept and do nothing, which is a customer who paid and got no wash.
   */
  programNumber: number;
  durationSeconds: number;
  sessionSource: SessionSource;
  reservationId?: ReservationId;
  params?: Record<string, unknown>;
}

/** StartService RESPONSE — Station → Server (discriminated union). */
export type StartServiceResponse =
  | { status: 'Accepted' }
  | {
      status: 'Rejected';
      errorCode: number;
      errorText: string;
      /**
       * ECHO of the programNumber from the request, REQUIRED when Rejected, so
       * the operator reading the rejection can see WHICH ordinal was refused
       * without correlating against the request. Matter requires the refused
       * path be echoed in every CommandStatus, and MDB's Remote Vend SELECTION
       * DENIED carries the item number it refused; Modbus omits it, and that
       * omission is the documented reason Modbus debugging is painful.
       */
      programNumber: number;
    };
