/**
 * Message originator as carried in the `source` field of the MQTT envelope.
 *
 * Source: spec/03-messages.md — Conventions.
 */
export enum MessageSource {
  /** Message originated from the station. */
  STATION = 'Station',

  /** Message originated from the server (or broker for LWT). */
  SERVER = 'Server',
}
