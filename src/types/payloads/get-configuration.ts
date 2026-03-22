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

/** GetConfiguration RESPONSE — Station → Server. */
export interface GetConfigurationResponse {
  configuration: ConfigurationEntry[];
  unknownKeys?: string[];
}
