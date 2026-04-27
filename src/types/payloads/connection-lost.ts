import type { StationId } from '../common.js';

/** ConnectionLost EVENT (LWT) — Broker → Server. */
export interface ConnectionLostPayload {
  stationId: StationId;
  reason: 'UnexpectedDisconnect';
}
