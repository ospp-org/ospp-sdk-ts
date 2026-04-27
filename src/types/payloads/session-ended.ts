import type { SessionId, BayId, CreditAmount, MeterValues } from '../common.js';
import { SessionEndReason } from '../../enums/SessionEndReason.js';

/** SessionEnded EVENT — Station → Server. */
export interface SessionEndedPayload {
  sessionId: SessionId;
  bayId: BayId;
  reason: SessionEndReason;
  actualDurationSeconds: number;
  creditsCharged: CreditAmount;
  meterValues?: MeterValues;
}
