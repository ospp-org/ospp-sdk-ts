/** Messages that can be triggered by TriggerMessage. */
export type TriggerableMessage =
  | 'BootNotification'
  | 'StatusNotification'
  | 'MeterValues'
  | 'Heartbeat'
  | 'DiagnosticsNotification'
  | 'FirmwareStatusNotification'
  | 'SecurityEvent'
  | 'SignCertificate';

/** TriggerMessage REQUEST — Server → Station. */
export interface TriggerMessageRequest {
  requestedMessage: TriggerableMessage;
  bayId?: string;
}

export type TriggerMessageStatus = 'Accepted' | 'Rejected' | 'NotImplemented';

/** TriggerMessage RESPONSE — Station → Server. */
export interface TriggerMessageResponse {
  status: TriggerMessageStatus;
}
