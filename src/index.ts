// Actions
export { OsppAction } from './actions/OsppAction';

// Enums
export { BayStatus } from './enums/BayStatus';
export { BootReason } from './enums/BootReason';
export { SessionEndReason } from './enums/SessionEndReason';
export { MessageType } from './enums/MessageType';
export { MessageSource } from './enums/MessageSource';
export {
  OsppErrorCode,
  OSPP_ERROR_REGISTRY,
  type OsppErrorMeta,
  type OsppErrorSeverity,
  type OsppErrorCategory,
} from './enums/OsppErrorCode';
export {
  ConfigKey,
  CONFIG_KEY_REGISTRY,
  type ConfigKeyMeta,
  type ConfigAccess,
  type ConfigMutability,
  type ConfigProfile,
  type ConfigValueType,
} from './enums/ConfigKey';

// Types — envelope
export {
  type OsppEnvelope,
  type CreateEnvelopeOptions,
  OSPP_PROTOCOL_VERSION,
  createEnvelope,
} from './types/envelope';

// Types — common
export type {
  StationId,
  SessionId,
  BayId,
  ReservationId,
  ServiceId,
  OfflinePassId,
  OfflineTxId,
  UserId,
  DeviceId,
  Timestamp,
  CreditAmount,
  MeterValues,
  Receipt,
  ServiceItem,
  PricingType,
  OfflinePass,
  OfflineAllowance,
  OfflineConstraints,
  SessionSource,
  ConnectionType,
  NetworkInfo,
  StationCapabilities,
} from './types/common';

// Types — payloads
export type { BootNotificationRequest, BootNotificationResponse } from './types/payloads/boot-notification';
export type { AuthorizeOfflinePassRequest, AuthorizeOfflinePassResponse } from './types/payloads/authorize-offline-pass';
export type { ReserveBayRequest, ReserveBayResponse } from './types/payloads/reserve-bay';
export type { CancelReservationRequest, CancelReservationResponse } from './types/payloads/cancel-reservation';
export type { StartServiceRequest, StartServiceResponse } from './types/payloads/start-service';
export type { StopServiceRequest, StopServiceResponse } from './types/payloads/stop-service';
export type { TransactionEventRequest, TransactionEventResponse } from './types/payloads/transaction-event';
export type { HeartbeatRequest, HeartbeatResponse } from './types/payloads/heartbeat';
export type { StatusNotificationPayload, BayServiceStatus } from './types/payloads/status-notification';
export type { MeterValuesPayload } from './types/payloads/meter-values';
export type { SessionEndedPayload } from './types/payloads/session-ended';
export type { ConnectionLostPayload } from './types/payloads/connection-lost';
export type { SecurityEventPayload, SecurityEventType, SecurityEventSeverity } from './types/payloads/security-event';
export type { ChangeConfigurationRequest, ChangeConfigurationResponse, ChangeConfigurationResult, ChangeConfigurationResultStatus, ConfigKeyValue } from './types/payloads/change-configuration';
export type { GetConfigurationRequest, GetConfigurationResponse, ConfigurationEntry } from './types/payloads/get-configuration';
export type { ResetRequest, ResetResponse, ResetType } from './types/payloads/reset';
export type { UpdateFirmwareRequest, UpdateFirmwareResponse } from './types/payloads/update-firmware';
export type { FirmwareStatusNotificationPayload, FirmwareNotificationStatus } from './types/payloads/firmware-status-notification';
export type { GetDiagnosticsRequest, GetDiagnosticsResponse } from './types/payloads/get-diagnostics';
export type { DiagnosticsNotificationPayload, DiagnosticsNotificationStatus } from './types/payloads/diagnostics-notification';
export type { SetMaintenanceModeRequest, SetMaintenanceModeResponse } from './types/payloads/set-maintenance-mode';
export type { UpdateServiceCatalogRequest, UpdateServiceCatalogResponse } from './types/payloads/update-service-catalog';
export { type CertificateType } from './types/payloads/sign-certificate';
export type { SignCertificateRequest, SignCertificateResponse } from './types/payloads/sign-certificate';
export type { CertificateInstallRequest, CertificateInstallResponse } from './types/payloads/certificate-install';
export type { TriggerCertificateRenewalRequest, TriggerCertificateRenewalResponse } from './types/payloads/trigger-certificate-renewal';
export type { DataTransferRequest, DataTransferResponse, DataTransferStatus } from './types/payloads/data-transfer';
export type { TriggerMessageRequest, TriggerMessageResponse, TriggerableMessage, TriggerMessageStatus } from './types/payloads/trigger-message';

// State machines
export { BayStateMachine, canTransition as canBayTransition, BAY_TRANSITIONS } from './state-machines/BayStateMachine';
export { SessionStateMachine, canTransition as canSessionTransition, isTerminal as isSessionTerminal, SESSION_TRANSITIONS, type SessionState } from './state-machines/SessionStateMachine';
export { ReservationStateMachine, canTransition as canReservationTransition, isTerminal as isReservationTerminal, RESERVATION_TRANSITIONS, type ReservationState } from './state-machines/ReservationStateMachine';
export { FirmwareStateMachine, canTransition as canFirmwareTransition, FIRMWARE_TRANSITIONS, type FirmwareState } from './state-machines/FirmwareStateMachine';
export { DiagnosticsStateMachine, canTransition as canDiagnosticsTransition, DIAGNOSTICS_TRANSITIONS, type DiagnosticsState } from './state-machines/DiagnosticsStateMachine';

// Crypto
export { canonicalize, canonicalizeToBytes } from './crypto/CanonicalJsonSerializer';
export { computeMac, verifyMac, signMessage } from './crypto/HmacSigner';
export { sign as ecdsaSign, verify as ecdsaVerify, SIGNATURE_ALGORITHM } from './crypto/EcdsaSigner';
export {
  ALWAYS_EXEMPT,
  CRITICAL_MESSAGE_TYPES,
  isCritical,
  requiresHmac,
  type MessageSigningMode,
} from './crypto/CriticalMessageRegistry';

// Topics
export { toServerTopic, toStationTopic, SERVER_WILDCARD_TOPIC, serverSharedTopic, extractStationId } from './topics/TopicBuilder';

// Validation
export { SchemaValidator, type ValidationResult } from './validation/SchemaValidator';

// Schema path resolver
export { SchemaPath } from './schemas/SchemaPath';
