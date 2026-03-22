/** DataTransfer REQUEST — Bidirectional. */
export interface DataTransferRequest {
  vendorId: string;
  dataId: string;
  data?: Record<string, unknown>;
}

export type DataTransferStatus = 'Accepted' | 'Rejected' | 'UnknownVendor' | 'UnknownData';

/** DataTransfer RESPONSE — Bidirectional. */
export interface DataTransferResponse {
  status: DataTransferStatus;
  data?: Record<string, unknown>;
}
