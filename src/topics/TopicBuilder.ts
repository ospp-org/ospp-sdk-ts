/**
 * MQTT topic helpers for OSPP.
 *
 * Source: spec/02-transport.md §2.
 *
 * OSPP uses exactly two topics per station:
 *   ospp/v1/stations/{stationId}/to-server   (Station → Server)
 *   ospp/v1/stations/{stationId}/to-station   (Server → Station)
 *
 * The `v1` segment is a namespace identifier, NOT the protocol version.
 * It remains `v1` for all OSPP 1.x protocol versions.
 */

import type { StationId } from '../types/common';

const TOPIC_PREFIX = 'ospp/v1/stations';

/** Topic the station publishes to (Station → Server). */
export function toServerTopic(stationId: StationId): string {
  return `${TOPIC_PREFIX}/${stationId}/to-server`;
}

/** Topic the station subscribes to (Server → Station). */
export function toStationTopic(stationId: StationId): string {
  return `${TOPIC_PREFIX}/${stationId}/to-station`;
}

/**
 * Server wildcard subscription for all station messages.
 * Uses MQTT `+` single-level wildcard.
 */
export const SERVER_WILDCARD_TOPIC = `${TOPIC_PREFIX}/+/to-server`;

/**
 * Server shared subscription for horizontal scaling.
 * Uses MQTT 5.0 `$share/{group}/` prefix.
 *
 * @param groupName - Shared subscription group (default: `ospp-servers`).
 */
export function serverSharedTopic(groupName = 'ospp-servers'): string {
  return `$share/${groupName}/${TOPIC_PREFIX}/+/to-server`;
}

/**
 * Extract the stationId from a topic string.
 * Returns `undefined` if the topic does not match the OSPP pattern.
 */
export function extractStationId(topic: string): StationId | undefined {
  const parts = topic.replace(/^\$share\/[^/]+\//, '').split('/');
  // Expected: ['ospp', 'v1', 'stations', '{stationId}', 'to-server' | 'to-station']
  if (
    parts.length === 5 &&
    parts[0] === 'ospp' &&
    parts[1] === 'v1' &&
    parts[2] === 'stations' &&
    (parts[4] === 'to-server' || parts[4] === 'to-station')
  ) {
    return parts[3];
  }
  return undefined;
}
