/**
 * MQTT message envelope — wraps every OSPP MQTT message.
 *
 * Source: spec/schemas/common/mqtt-envelope.schema.json
 *         spec/03-messages.md — Conventions
 *
 * All MQTT messages are published on two topics per station:
 *   ospp/v1/stations/{stationId}/to-server   (Station → Server)
 *   ospp/v1/stations/{stationId}/to-station   (Server → Station)
 *
 * The `action` field identifies the message; there is NO topic-per-action.
 */

import { OsppAction } from '../actions/OsppAction.js';
import { MessageType } from '../enums/MessageType.js';
import { MessageSource } from '../enums/MessageSource.js';

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

/**
 * Standard MQTT envelope for all OSPP messages.
 *
 * @typeParam T - The action-specific payload type.
 */
export interface OsppEnvelope<T = unknown> {
  /** Unique identifier (1-64 chars). Used for correlation and deduplication. */
  messageId: string;

  /** Request, Response, or Event. */
  messageType: MessageType;

  /** The action name identifying which operation this message relates to. */
  action: OsppAction;

  /** ISO 8601 UTC with milliseconds, e.g. "2026-01-30T12:00:00.000Z". */
  timestamp: string;

  /** Who originated this message. ConnectionLost LWT uses 'Server'. */
  source: MessageSource;

  /** Semantic version of the OSPP protocol, e.g. "0.3.0". */
  protocolVersion: string;

  /** Action-specific payload. */
  payload: T;

  /** Base64-encoded HMAC-SHA256 for message integrity (conditional). */
  mac?: string;
}

// ---------------------------------------------------------------------------
// Protocol version constant
// ---------------------------------------------------------------------------

/**
 * Current wire protocol version — the value spec Chapter 08 gives for the
 * `ProtocolVersion` configuration key, which is what a peer expects to see in
 * the envelope.
 *
 * This was `0.2.1` up to and including 0.14.0, and stopped being correct at spec
 * v0.10.0 — four minor releases during which nothing failed, because every known
 * consumer already overrode it: csms-server through `OSPP_PROTOCOL_VERSION`,
 * ts-station-simulator through its own `WIRE_PROTOCOL_VERSION` constant. A
 * default nothing exercises cannot be observed to be wrong. Do not read the
 * quiet as evidence that the value does not matter; read it as the reason this
 * one went stale for a year.
 *
 * Keep it equal to `ospp/protocol` (PHP) `ProtocolVersion::default()`. The two
 * SDKs are released as a pair for exactly this: fixing one alone converts a
 * shared staleness into a disagreement, which is strictly worse — a station and
 * a server that disagree about the version fail negotiation with `1007
 * PROTOCOL_VERSION_MISMATCH` and the failure names the version, not the SDK.
 */
export const OSPP_PROTOCOL_VERSION = '0.3.0';

// ---------------------------------------------------------------------------
// Envelope factory helpers
// ---------------------------------------------------------------------------

/** Options for creating an envelope (payload + action are always required). */
export interface CreateEnvelopeOptions<T> {
  messageId: string;
  messageType: MessageType;
  action: OsppAction;
  source: MessageSource;
  payload: T;
  /** Defaults to current UTC timestamp if omitted. */
  timestamp?: string;
  /** Defaults to OSPP_PROTOCOL_VERSION if omitted. */
  protocolVersion?: string;
  mac?: string;
}

/** Build an OsppEnvelope with sensible defaults. */
export function createEnvelope<T>(opts: CreateEnvelopeOptions<T>): OsppEnvelope<T> {
  const envelope: OsppEnvelope<T> = {
    messageId: opts.messageId,
    messageType: opts.messageType,
    action: opts.action,
    timestamp: opts.timestamp ?? new Date().toISOString().replace(/(\.\d{3})\d*Z$/, '$1Z'),
    source: opts.source,
    protocolVersion: opts.protocolVersion ?? OSPP_PROTOCOL_VERSION,
    payload: opts.payload,
  };

  if (opts.mac !== undefined) {
    envelope.mac = opts.mac;
  }

  return envelope;
}
