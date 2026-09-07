import type { StationId } from '../common.js';

/**
 * Why the station is no longer connected.
 *
 * `UnexpectedDisconnect` is the Last Will and Testament value. It is registered in
 * the MQTT CONNECT packet and published by the BROKER, so it can only ever describe
 * a drop the station did not choose — at the moment the will is written the station
 * cannot know how the connection will end.
 *
 * `PlannedShutdown` is published by the STATION itself, on its own topic, as its last
 * message before a clean MQTT DISCONNECT. A clean DISCONNECT suppresses the will, so
 * without this value a station shutting down on purpose has no true thing to say: stay
 * silent and the server believes it alive until the heartbeat timeout, or drop the link
 * ungracefully so the broker publishes a will that lies. Added in spec 0.36.0.
 */
export type ConnectionLostReason = 'UnexpectedDisconnect' | 'PlannedShutdown';

/** ConnectionLost EVENT — Broker → Server (LWT), or Station → Server (planned shutdown). */
export interface ConnectionLostPayload {
  stationId: StationId;
  reason: ConnectionLostReason;
}
