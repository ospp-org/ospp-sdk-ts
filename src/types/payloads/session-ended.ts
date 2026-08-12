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
   * Optional per-session monotonic counter, continuing the session's MeterValues
   * sequence — the next value after the last MeterValues emitted, NOT a repeat of
   * it. Every session-scoped EVENT increments by exactly 1.
   * See spec/02-transport.md §3.2.
   */
  seqNo?: number;
  /**
   * Optional canonical session-final marker — the highest seqNo emitted for
   * this session. Servers MUST discard any MeterValues with seqNo > finalSeqNo
   * received subsequently for the same sessionId. See spec/02-transport.md §3.2.
   */
  finalSeqNo?: number;
}
