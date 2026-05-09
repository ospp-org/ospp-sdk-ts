import type { BayId, SessionId, Timestamp, MeterValues } from '../common.js';

/** MeterValues EVENT — Station → Server. */
export interface MeterValuesPayload {
  bayId: BayId;
  sessionId: SessionId;
  timestamp: Timestamp;
  values: MeterValues;
  /**
   * Optional per-session monotonic counter starting at 0, incrementing by 1
   * for each session-scoped EVENT (MeterValues, SessionEnded). Receivers
   * MUST verify increment-by-1 and flag billing-milestone-crossing gaps
   * as HIGH-severity reconciliation audits. See spec/02-transport.md §3.2.
   */
  seqNo?: number;
}
