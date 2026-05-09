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
  /**
   * Optional per-session monotonic counter (matches the running seqNo of the
   * last MeterValues emitted for the session). See spec/02-transport.md §3.2.
   */
  seqNo?: number;
  /**
   * Optional canonical session-final marker — the highest seqNo emitted for
   * this session. Servers MUST discard any MeterValues with seqNo > finalSeqNo
   * received subsequently for the same sessionId. See spec/02-transport.md §3.2.
   */
  finalSeqNo?: number;
}
