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
 * Every variant is terminal for the station's copy except `RetryLater`,
 * which is the only status directing the station to send the same
 * transaction again. The server never holds a transaction in an
 * unresolved state: an offline transaction that reaches the server is
 * settled, deduplicated, or rejected on its own merits, and the station
 * always learns which.
 *
 * A fifth variant, `Deferred`, existed from spec 0.5.0 and was retired in
 * 0.9.0 together with the txCounter gap-blocking rule it was invented to
 * express. It directed the station to hold a transaction pending an
 * operator-manual unblock that was never implemented in any repository,
 * so the money it held could not be settled. The wire schema no longer
 * admits the value.
 */
export type TransactionEventResponse =
  | { status: 'Accepted' }
  | { status: 'Duplicate'; reason: string }
  | { status: 'Rejected'; reason: string }
  | { status: 'RetryLater'; reason: string };
