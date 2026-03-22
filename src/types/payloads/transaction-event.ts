import type { OfflineTxId, OfflinePassId, UserId, BayId, ServiceId, Timestamp, CreditAmount, Receipt, MeterValues } from '../common';

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

/** TransactionEvent RESPONSE — Server → Station (discriminated union). */
export type TransactionEventResponse =
  | { status: 'Accepted' }
  | { status: 'Duplicate'; reason: string }
  | { status: 'Rejected'; reason: string }
  | { status: 'RetryLater'; reason: string };
