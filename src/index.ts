// Browser-safe barrel for @ospp/protocol.
//
// Pure types, enums, value objects, envelope builder, topic helpers,
// state machines, and the string-returning canonical serializer.
//
// Node-only utilities (SchemaPath, SchemaValidator, HMAC/ECDSA signers,
// canonicalizeToBytes) live in '@ospp/protocol/server'.

// Actions
export { OsppAction } from './actions/OsppAction.js';

// Enums
export { BayStatus } from './enums/BayStatus.js';
export { BootReason } from './enums/BootReason.js';
export { SessionEndReason } from './enums/SessionEndReason.js';
export { MessageType } from './enums/MessageType.js';
export { MessageSource } from './enums/MessageSource.js';
export {
  OsppErrorCode,
  OSPP_ERROR_REGISTRY,
  type OsppErrorMeta,
  type OsppErrorSeverity,
  type OsppErrorCategory,
} from './enums/OsppErrorCode.js';
export {
  ConfigKey,
  CONFIG_KEY_REGISTRY,
  type ConfigKeyMeta,
  type ConfigAccess,
  type ConfigMutability,
  type ConfigProfile,
  type ConfigValueType,
} from './enums/ConfigKey.js';

// Types — envelope
export {
  type OsppEnvelope,
  type CreateEnvelopeOptions,
  OSPP_PROTOCOL_VERSION,
  createEnvelope,
} from './types/envelope.js';

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
} from './types/common.js';

// Types — payloads
export type { BootNotificationRequest, BootNotificationResponse } from './types/payloads/boot-notification.js';
export type { AuthorizeOfflinePassRequest, AuthorizeOfflinePassResponse } from './types/payloads/authorize-offline-pass.js';
export type { ReserveBayRequest, ReserveBayResponse } from './types/payloads/reserve-bay.js';
export type { CancelReservationRequest, CancelReservationResponse } from './types/payloads/cancel-reservation.js';
export type { StartServiceRequest, StartServiceResponse } from './types/payloads/start-service.js';
export type { StopServiceRequest, StopServiceResponse } from './types/payloads/stop-service.js';
export type { TransactionEventRequest, TransactionEventResponse } from './types/payloads/transaction-event.js';
export type { HeartbeatRequest, HeartbeatResponse } from './types/payloads/heartbeat.js';
export type { StatusNotificationPayload, BayServiceStatus } from './types/payloads/status-notification.js';
export type { MeterValuesPayload } from './types/payloads/meter-values.js';
export type { SessionEndedPayload } from './types/payloads/session-ended.js';
export type { ConnectionLostPayload } from './types/payloads/connection-lost.js';
export type { SecurityEventPayload, SecurityEventType, SecurityEventSeverity } from './types/payloads/security-event.js';
export type { ChangeConfigurationRequest, ChangeConfigurationResponse, ChangeConfigurationResult, ChangeConfigurationResultStatus, ConfigKeyValue } from './types/payloads/change-configuration.js';
export type { GetConfigurationRequest, GetConfigurationResponse, ConfigurationEntry } from './types/payloads/get-configuration.js';
export type { ResetRequest, ResetResponse, ResetType } from './types/payloads/reset.js';
export type { UpdateFirmwareRequest, UpdateFirmwareResponse } from './types/payloads/update-firmware.js';
export type { FirmwareStatusNotificationPayload, FirmwareNotificationStatus } from './types/payloads/firmware-status-notification.js';
export type { GetDiagnosticsRequest, GetDiagnosticsResponse } from './types/payloads/get-diagnostics.js';
export type { DiagnosticsNotificationPayload, DiagnosticsNotificationStatus } from './types/payloads/diagnostics-notification.js';
export type { SetMaintenanceModeRequest, SetMaintenanceModeResponse } from './types/payloads/set-maintenance-mode.js';
export type { UpdateServiceCatalogRequest, UpdateServiceCatalogResponse } from './types/payloads/update-service-catalog.js';
export { type CertificateType } from './types/payloads/sign-certificate.js';
export type { SignCertificateRequest, SignCertificateResponse } from './types/payloads/sign-certificate.js';
export type { CertificateInstallRequest, CertificateInstallResponse } from './types/payloads/certificate-install.js';
export type { TriggerCertificateRenewalRequest, TriggerCertificateRenewalResponse } from './types/payloads/trigger-certificate-renewal.js';
export type { DataTransferRequest, DataTransferResponse, DataTransferStatus } from './types/payloads/data-transfer.js';
export type { TriggerMessageRequest, TriggerMessageResponse, TriggerableMessage, TriggerMessageStatus } from './types/payloads/trigger-message.js';

// State machines
export { BayStateMachine, canTransition as canBayTransition, BAY_TRANSITIONS } from './state-machines/BayStateMachine.js';
export { SessionStateMachine, canTransition as canSessionTransition, isTerminal as isSessionTerminal, SESSION_TRANSITIONS, type SessionState } from './state-machines/SessionStateMachine.js';
export { ReservationStateMachine, canTransition as canReservationTransition, isTerminal as isReservationTerminal, RESERVATION_TRANSITIONS, type ReservationState } from './state-machines/ReservationStateMachine.js';
export { FirmwareStateMachine, canTransition as canFirmwareTransition, FIRMWARE_TRANSITIONS, type FirmwareState } from './state-machines/FirmwareStateMachine.js';
export { DiagnosticsStateMachine, canTransition as canDiagnosticsTransition, DIAGNOSTICS_TRANSITIONS, type DiagnosticsState } from './state-machines/DiagnosticsStateMachine.js';

// Topics
export { toServerTopic, toStationTopic, SERVER_WILDCARD_TOPIC, serverSharedTopic, extractStationId } from './topics/TopicBuilder.js';

// Crypto — pure JS only
export { canonicalize } from './crypto/CanonicalJsonSerializer.js';
export {
  ALWAYS_EXEMPT,
  CRITICAL_MESSAGE_TYPES,
  isCritical,
  requiresHmac,
  type MessageSigningMode,
} from './crypto/CriticalMessageRegistry.js';
