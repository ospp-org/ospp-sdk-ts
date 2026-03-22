/** A single key-value pair in a ChangeConfiguration request. */
export interface ConfigKeyValue {
  key: string;
  value: string;
}

/** ChangeConfiguration REQUEST — Server → Station. */
export interface ChangeConfigurationRequest {
  keys: ConfigKeyValue[];
}

export type ChangeConfigurationResultStatus = 'Accepted' | 'RebootRequired' | 'Rejected' | 'NotSupported';

/** Per-key result in a ChangeConfiguration response. */
export interface ChangeConfigurationResult {
  key: string;
  status: ChangeConfigurationResultStatus;
  errorCode?: number;
  errorText?: string;
}

/** ChangeConfiguration RESPONSE — Station → Server. */
export interface ChangeConfigurationResponse {
  results: ChangeConfigurationResult[];
}
