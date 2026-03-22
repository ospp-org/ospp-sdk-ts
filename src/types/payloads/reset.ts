export type ResetType = 'Soft' | 'Hard';

/** Reset REQUEST — Server → Station. */
export interface ResetRequest {
  type: ResetType;
}

/** Reset RESPONSE — Station → Server (discriminated union). */
export type ResetResponse =
  | { status: 'Accepted' }
  | { status: 'Rejected'; errorCode: number; errorText: string };
