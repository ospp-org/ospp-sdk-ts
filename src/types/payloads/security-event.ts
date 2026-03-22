import type { Timestamp } from '../common';

/** Security event types from spec/schemas/mqtt/security-event.schema.json. */
export type SecurityEventType =
  | 'MacVerificationFailure'
  | 'CertificateError'
  | 'UnauthorizedAccess'
  | 'OfflinePassRejected'
  | 'TamperDetected'
  | 'BruteForceAttempt'
  | 'FirmwareIntegrityFailure'
  | 'FirmwareDowngradeAttempt'
  | 'HardwareFault'
  | 'SoftwareFault'
  | 'ClockSkew';

export type SecurityEventSeverity = 'Critical' | 'Error' | 'Warning' | 'Info';

/** SecurityEvent EVENT — Station → Server. */
export interface SecurityEventPayload {
  eventId: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: Timestamp;
  details: Record<string, unknown>;
}
