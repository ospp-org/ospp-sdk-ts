import type { Timestamp } from '../common';

/** Heartbeat REQUEST — Station → Server. Empty payload. */
export type HeartbeatRequest = Record<string, never>;

/** Heartbeat RESPONSE — Server → Station. */
export interface HeartbeatResponse {
  serverTime: Timestamp;
}
