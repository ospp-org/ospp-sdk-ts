/**
 * MQTT envelope message types.
 *
 * Source: spec/03-messages.md — Conventions.
 * Carried in the `messageType` field of every MQTT envelope.
 */
export enum MessageType {
  /** Command or query — expects a Response with the same messageId. */
  REQUEST = 'Request',

  /** Reply to a Request — messageId matches the originating Request. */
  RESPONSE = 'Response',

  /** Unsolicited notification — no response expected. */
  EVENT = 'Event',
}
