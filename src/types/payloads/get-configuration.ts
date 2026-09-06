/** GetConfiguration REQUEST — Server → Station. */
export interface GetConfigurationRequest {
  keys?: string[];
}

/** A single configuration entry in a GetConfiguration response. */
export interface ConfigurationEntry {
  key: string;
  value: string;
  readonly: boolean;
}

/**
 * GetConfiguration RESPONSE — Station → Server.
 *
 * `configuration` is REQUIRED on every branch, refusals included, and that is not an
 * oversight: a refusing station has zero entries to report and `[]` is the value this
 * message already uses to say so (spec 0.35.0, `07-errors.md` §2.1). Reading a refusal
 * therefore means testing `errorCode`, never testing the array for emptiness — an empty
 * `configuration` with no `errorCode` is an ordinary answer, and the spec mandates it when
 * every requested key is unknown or every named key is WriteOnly.
 */
export interface GetConfigurationResponse {
  configuration: ConfigurationEntry[];
  unknownKeys?: string[];
  /**
   * Numeric registry code of a refusal (spec 0.35.0). Its presence is the discriminator:
   * present means refused, absent means answered. Travels with `errorText`, and on this
   * branch both arrays are empty.
   */
  errorCode?: number;
  /** Registry NAME of the refusal, `UPPER_SNAKE_CASE`. Never emitted without `errorCode`. */
  errorText?: string;
}
