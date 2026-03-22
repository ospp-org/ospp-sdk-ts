import type { StationId } from '../common';

/** ConnectionLost EVENT (LWT) — Broker → Server. */
export interface ConnectionLostPayload {
  stationId: StationId;
  reason: 'UnexpectedDisconnect';
}
