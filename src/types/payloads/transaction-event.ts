import type { OfflineTxId, OfflinePassId, UserId, BayId, ServiceId, Timestamp, CreditAmount, Receipt, MeterValues } from '../common.js';

/** TransactionEvent REQUEST — Station → Server (offline reconciliation). */
export interface TransactionEventRequest {
  offlineTxId: OfflineTxId;
  offlinePassId: OfflinePassId;
  userId: UserId;
  bayId: BayId;
  serviceId: ServiceId;
  startedAt: Timestamp;
  endedAt: Timestamp;
  durationSeconds: number;
  creditsCharged: CreditAmount;
  receipt: Receipt;
  txCounter: number;
  meterValues?: MeterValues;
}

/**
 * TransactionEvent RESPONSE — Server → Station (discriminated union).
 *
 * `Deferred` (spec 0.5.0 §4.2 step 4) is distinct from `RetryLater` in
 * station-side semantics: `RetryLater` directs the station to back off and
 * resend the same transaction (transient server condition); `Deferred`
 * directs the station that the transaction is held server-side pending
 * operator-manual unblock OR arrival of the missing in-sequence
 * transactions, and the station MUST NOT auto-resend. Distinct variants
 * keep the two semantics typecheck-separable.
 */
export type TransactionEventResponse =
  | { status: 'Accepted' }
  | { status: 'Duplicate'; reason: string }
  | { status: 'Rejected'; reason: string }
  | { status: 'RetryLater'; reason: string }
  | { status: 'Deferred'; reason: string };
