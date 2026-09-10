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
// The envelope cap
// ---------------------------------------------------------------------------

/**
 * Maximum bytes of a serialised MQTT envelope — spec/02-transport.md §10.2.1.
 *
 * WHY THIS IS A CONSTANT AND NOT A SCHEMA KEYWORD. The bound is on the SERIALISED
 * envelope and JSON Schema has no keyword for the length of a serialisation. Nor
 * could it be pushed down into field bounds: measured over the 86 schemas in the
 * spec repository, 37 of the 47 MQTT message schemas admit a bounded serialisation
 * and the other 10 carry 12 unbounded members — 7 arrays with no `maxItems` and 5
 * open objects, which no `maxItems` can close.
 *
 * WHY 64 512 AND NOT 65 536. 65 536 is the MQTT *packet* ceiling — the
 * `maximumPacketSize` a broker declares in CONNACK. A PUBLISH packet is the payload
 * plus its header, so an envelope sized at the packet ceiling makes a packet above
 * it and the broker drops what the emitter was told was legal. The 1 024 bytes held
 * back are the header allowance: 4 fixed + at most 151 topic (`topicPrefix` <= 64,
 * `stationId` <= 64) + 2 packet identifier + at most 128 of MQTT 5 properties = 285
 * at every one of those fields' own maxima, so the allowance is 3.6x the worst case.
 */
export const MAX_ENVELOPE_BYTES = 64512;

/**
 * The MQTT packet ceiling the cap sits inside — spec/02-transport.md §1.2. Exported
 * for callers that size a receive buffer or configure a broker; a broker MUST NOT be
 * configured below it.
 */
export const MQTT_MAX_PACKET_BYTES = 65536;

const utf8 = new TextEncoder();

/**
 * Byte length of a serialised envelope. NOT `String.length`, which counts UTF-16 code
 * units: `'é'.length` is 1 and it costs 2 bytes on the wire, and an astral character
 * counts 2 in JS and costs 4. The cap is stated in bytes because that is what the
 * broker measures.
 */
export function envelopeByteLength(serialised: string | Uint8Array): number {
  return typeof serialised === 'string' ? utf8.encode(serialised).length : serialised.length;
}

/**
 * The RECEIVER half, and it takes raw bytes on purpose.
 *
 * spec/02-transport.md §10.2.1 lets a receiver refuse on serialised length alone,
 * BEFORE parsing and BEFORE verifying `mac` — the only refusal permitted to precede
 * MAC verification, because verifying a MAC means re-canonicalising the whole
 * envelope and therefore holding all of it. This is the one check that never has to
 * enter the buffer it protects, which is the entire point of it.
 */
export function exceedsEnvelopeCap(serialised: string | Uint8Array): boolean {
  return envelopeByteLength(serialised) > MAX_ENVELOPE_BYTES;
}

/** Bytes still available under the cap; negative when it is already exceeded. */
export function remainingEnvelopeBytes(serialised: string | Uint8Array): number {
  return MAX_ENVELOPE_BYTES - envelopeByteLength(serialised);
}

/**
 * The EMITTER half. Throws rather than returning a flag, because §10.2.1 states the
 * emitter obligation as a MUST NOT and a returned flag is a MUST NOT nobody has to
 * read. `action` is threaded through only so the message names the message: an
 * oversized envelope is almost always one action's payload growing without a bound of
 * its own.
 */
export function assertWithinEnvelopeCap(serialised: string | Uint8Array, action = ''): void {
  const length = envelopeByteLength(serialised);
  if (length <= MAX_ENVELOPE_BYTES) return;

  const subject = action === '' ? 'envelope' : `${action} envelope`;
  throw new RangeError(
    `Refusing to publish: ${subject} is ${length} bytes, over the ${MAX_ENVELOPE_BYTES}-byte ` +
      `envelope cap (spec/02-transport.md §10.2.1) by ${length - MAX_ENVELOPE_BYTES}. ` +
      `The MQTT packet ceiling is ${MQTT_MAX_PACKET_BYTES}; the difference is the PUBLISH header allowance.`,
  );
}

/**
 * Serialise an envelope for the wire and refuse to hand back bytes no publisher may
 * send. Fail-closed by design, and the alternative is worse than a throw: an envelope
 * over the cap is one the broker drops for exceeding its declared `maximumPacketSize`,
 * so the caller loses the message either way — the only question is whether it learns
 * why here or watches a PUBLISH disappear.
 *
 * This is a WIRE serialiser, not the canonical one: key order is insertion order, not
 * sorted. Use `canonicalJson` from `crypto/` for anything that feeds a MAC.
 */
export function serializeEnvelopeForWire<T>(envelope: OsppEnvelope<T>): string {
  const json = JSON.stringify(envelope);
  assertWithinEnvelopeCap(json, envelope.action);
  return json;
}

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
