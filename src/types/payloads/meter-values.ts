import type { BayId, SessionId, Timestamp, MeterValues } from '../common';

/** MeterValues EVENT — Station → Server. */
export interface MeterValuesPayload {
  bayId: BayId;
  sessionId: SessionId;
  timestamp: Timestamp;
  values: MeterValues;
}
