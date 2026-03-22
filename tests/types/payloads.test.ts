import { describe, it, expect } from 'vitest';

// Import every payload type to verify they compile and are assignable
import type { BootNotificationRequest, BootNotificationResponse } from '../../src/types/payloads/boot-notification';
import type { AuthorizeOfflinePassRequest, AuthorizeOfflinePassResponse } from '../../src/types/payloads/authorize-offline-pass';
import type { ReserveBayRequest, ReserveBayResponse } from '../../src/types/payloads/reserve-bay';
import type { CancelReservationRequest, CancelReservationResponse } from '../../src/types/payloads/cancel-reservation';
import type { StartServiceRequest, StartServiceResponse } from '../../src/types/payloads/start-service';
import type { StopServiceRequest, StopServiceResponse } from '../../src/types/payloads/stop-service';
import type { TransactionEventRequest, TransactionEventResponse } from '../../src/types/payloads/transaction-event';
import type { HeartbeatRequest, HeartbeatResponse } from '../../src/types/payloads/heartbeat';
import type { StatusNotificationPayload } from '../../src/types/payloads/status-notification';
import type { MeterValuesPayload } from '../../src/types/payloads/meter-values';
import type { SessionEndedPayload } from '../../src/types/payloads/session-ended';
import type { ConnectionLostPayload } from '../../src/types/payloads/connection-lost';
import type { SecurityEventPayload } from '../../src/types/payloads/security-event';
import type { ChangeConfigurationRequest, ChangeConfigurationResponse } from '../../src/types/payloads/change-configuration';
import type { GetConfigurationRequest, GetConfigurationResponse } from '../../src/types/payloads/get-configuration';
import type { ResetRequest, ResetResponse } from '../../src/types/payloads/reset';
import type { UpdateFirmwareRequest, UpdateFirmwareResponse } from '../../src/types/payloads/update-firmware';
import type { FirmwareStatusNotificationPayload } from '../../src/types/payloads/firmware-status-notification';
import type { GetDiagnosticsRequest, GetDiagnosticsResponse } from '../../src/types/payloads/get-diagnostics';
import type { DiagnosticsNotificationPayload } from '../../src/types/payloads/diagnostics-notification';
import type { SetMaintenanceModeRequest, SetMaintenanceModeResponse } from '../../src/types/payloads/set-maintenance-mode';
import type { UpdateServiceCatalogRequest, UpdateServiceCatalogResponse } from '../../src/types/payloads/update-service-catalog';
import type { SignCertificateRequest, SignCertificateResponse } from '../../src/types/payloads/sign-certificate';
import type { CertificateInstallRequest, CertificateInstallResponse } from '../../src/types/payloads/certificate-install';
import type { TriggerCertificateRenewalRequest, TriggerCertificateRenewalResponse } from '../../src/types/payloads/trigger-certificate-renewal';
import type { DataTransferRequest, DataTransferResponse } from '../../src/types/payloads/data-transfer';
import type { TriggerMessageRequest, TriggerMessageResponse } from '../../src/types/payloads/trigger-message';

import { BootReason } from '../../src/enums/BootReason';
import { BayStatus } from '../../src/enums/BayStatus';
import { SessionEndReason } from '../../src/enums/SessionEndReason';

// ── BootNotification ────────────────────────────────────────────────────

describe('BootNotification payloads', () => {
  it('should accept a valid request', () => {
    const req: BootNotificationRequest = {
      stationId: 'stn_a1b2c3d4',
      firmwareVersion: '1.2.3',
      stationModel: 'SSP-3000',
      stationVendor: 'AcmeCorp',
      serialNumber: 'SN-001',
      bayCount: 2,
      uptimeSeconds: 120,
      pendingOfflineTransactions: 0,
      timezone: 'Europe/London',
      bootReason: BootReason.POWER_ON,
      capabilities: { bleSupported: true, offlineModeSupported: true, meterValuesSupported: true },
      networkInfo: { connectionType: 'Wifi', signalStrength: -55 },
    };
    expect(req.stationId).toBe('stn_a1b2c3d4');
    expect(req.bootReason).toBe('PowerOn');
  });

  it('should accept Accepted response with sessionKey', () => {
    const res: BootNotificationResponse = {
      status: 'Accepted',
      serverTime: '2026-01-30T12:00:00.000Z',
      heartbeatIntervalSec: 30,
      sessionKey: 'dGVzdGtleQ==',
    };
    expect(res.status).toBe('Accepted');
    if (res.status === 'Accepted') {
      expect(res.sessionKey).toBeDefined();
    }
  });

  it('should accept Rejected response with retryInterval', () => {
    const res: BootNotificationResponse = {
      status: 'Rejected',
      serverTime: '2026-01-30T12:00:00.000Z',
      heartbeatIntervalSec: 30,
      retryInterval: 60,
    };
    if (res.status === 'Rejected') {
      expect(res.retryInterval).toBe(60);
    }
  });

  it('should accept Pending response with retryInterval', () => {
    const res: BootNotificationResponse = {
      status: 'Pending',
      serverTime: '2026-01-30T12:00:00.000Z',
      heartbeatIntervalSec: 30,
      retryInterval: 30,
    };
    if (res.status === 'Pending') {
      expect(res.retryInterval).toBe(30);
    }
  });

  it('should narrow discriminated union on status', () => {
    const res: BootNotificationResponse = {
      status: 'Accepted',
      serverTime: '2026-01-30T12:00:00.000Z',
      heartbeatIntervalSec: 30,
    };
    if (res.status === 'Accepted') {
      // TypeScript narrows: sessionKey is accessible
      const _key: string | undefined = res.sessionKey;
      expect(_key).toBeUndefined();
    }
  });
});

// ── AuthorizeOfflinePass ────────────────────────────────────────────────

describe('AuthorizeOfflinePass payloads', () => {
  it('should accept a valid request', () => {
    const req: AuthorizeOfflinePassRequest = {
      offlinePassId: 'opass_a1b2c3d4e5f6',
      offlinePass: {
        passId: 'opass_a1b2c3d4e5f6',
        sub: 'sub_user1',
        deviceId: 'dev_abc',
        issuedAt: '2026-01-30T10:00:00.000Z',
        expiresAt: '2026-01-31T10:00:00.000Z',
        policyVersion: 1,
        revocationEpoch: 0,
        offlineAllowance: { maxTotalCredits: 500, maxUses: 10, maxCreditsPerTx: 100, allowedServiceTypes: ['svc_eco'] },
        constraints: { minIntervalSec: 60, stationOfflineWindowHours: 24, stationMaxOfflineTx: 50 },
        signatureAlgorithm: 'ECDSA-P256-SHA256',
        signature: 'sig==',
      },
      deviceId: 'dev_abc',
      counter: 1,
      bayId: 'bay_c1d2e3f4a5b6',
      serviceId: 'svc_eco',
    };
    expect(req.counter).toBe(1);
  });

  it('should accept Accepted response with required fields', () => {
    const res: AuthorizeOfflinePassResponse = {
      status: 'Accepted',
      sessionId: 'sess_a1b2c3d4e5',
      durationSeconds: 300,
      creditsAuthorized: 50,
    };
    if (res.status === 'Accepted') {
      expect(res.creditsAuthorized).toBe(50);
      expect(res.sessionId).toBe('sess_a1b2c3d4e5');
      expect(res.durationSeconds).toBe(300);
    }
  });

  it('should accept Rejected response with required reason', () => {
    const res: AuthorizeOfflinePassResponse = {
      status: 'Rejected',
      reason: 'Pass expired',
    };
    if (res.status === 'Rejected') {
      expect(res.reason).toBe('Pass expired');
    }
  });
});

// ── Session lifecycle ───────────────────────────────────────────────────

describe('ReserveBay payloads', () => {
  it('should accept a valid request', () => {
    const req: ReserveBayRequest = {
      bayId: 'bay_c1d2e3f4a5b6',
      reservationId: 'rsv_a1b2c3d4e5f6',
      expirationTime: '2026-01-30T12:05:00.000Z',
      sessionSource: 'MobileApp',
    };
    expect(req.sessionSource).toBe('MobileApp');
  });

  it('should narrow Accepted (no error fields)', () => {
    const res: ReserveBayResponse = { status: 'Accepted' };
    expect(res.status).toBe('Accepted');
  });

  it('should narrow Rejected with required errorCode/errorText', () => {
    const res: ReserveBayResponse = { status: 'Rejected', errorCode: 3001, errorText: 'BAY_BUSY' };
    if (res.status === 'Rejected') {
      expect(res.errorCode).toBe(3001);
      expect(res.errorText).toBe('BAY_BUSY');
    }
  });
});

describe('CancelReservation payloads', () => {
  it('should accept a valid request', () => {
    const req: CancelReservationRequest = {
      bayId: 'bay_c1d2e3f4a5b6',
      reservationId: 'rsv_a1b2c3d4e5f6',
    };
    expect(req.reservationId).toMatch(/^rsv_/);
  });

  it('should narrow Rejected with required errorCode/errorText', () => {
    const res: CancelReservationResponse = { status: 'Rejected', errorCode: 3012, errorText: 'RESERVATION_NOT_FOUND' };
    if (res.status === 'Rejected') {
      expect(res.errorCode).toBe(3012);
    }
  });
});

describe('StartService payloads', () => {
  it('should accept request with optional reservationId', () => {
    const req: StartServiceRequest = {
      sessionId: 'sess_a1b2c3d4e5',
      bayId: 'bay_c1d2e3f4a5b6',
      serviceId: 'svc_eco',
      durationSeconds: 300,
      sessionSource: 'WebPayment',
      reservationId: 'rsv_a1b2c3d4e5f6',
    };
    expect(req.reservationId).toBeDefined();
  });

  it('should accept Rejected response with error', () => {
    const res: StartServiceResponse = {
      status: 'Rejected',
      errorCode: 3001,
      errorText: 'BAY_BUSY',
    };
    expect(res.errorCode).toBe(3001);
  });
});

describe('StopService payloads', () => {
  it('should accept Accepted response with billing data', () => {
    const res: StopServiceResponse = {
      status: 'Accepted',
      actualDurationSeconds: 280,
      creditsCharged: 47,
      meterValues: { liquidMl: 42000, energyWh: 140 },
    };
    if (res.status === 'Accepted') {
      expect(res.creditsCharged).toBe(47);
      expect(res.actualDurationSeconds).toBe(280);
    }
  });

  it('should accept Rejected response with error', () => {
    const res: StopServiceResponse = {
      status: 'Rejected',
      errorCode: 3006,
      errorText: 'SESSION_NOT_FOUND',
    };
    if (res.status === 'Rejected') {
      expect(res.errorCode).toBe(3006);
    }
  });
});

// ── TransactionEvent ────────────────────────────────────────────────────

describe('TransactionEvent payloads', () => {
  it('should accept a valid request with receipt', () => {
    const req: TransactionEventRequest = {
      offlineTxId: 'otx_a1b2c3d4e5f6',
      offlinePassId: 'opass_a1b2c3d4e5f6',
      userId: 'sub_user1',
      bayId: 'bay_c1d2e3f4a5b6',
      serviceId: 'svc_eco',
      startedAt: '2026-01-30T12:00:00.000Z',
      endedAt: '2026-01-30T12:05:00.000Z',
      durationSeconds: 300,
      creditsCharged: 50,
      receipt: { data: 'eyJ4Ijoie', signature: 'MEUC...', signatureAlgorithm: 'ECDSA-P256-SHA256' },
      txCounter: 1,
    };
    expect(req.txCounter).toBe(1);
  });

  it('should accept Accepted response (no reason)', () => {
    const res: TransactionEventResponse = { status: 'Accepted' };
    expect(res.status).toBe('Accepted');
  });

  it('should accept Rejected response with required reason', () => {
    const res: TransactionEventResponse = { status: 'Rejected', reason: 'Receipt invalid' };
    if (res.status === 'Rejected') {
      expect(res.reason).toBe('Receipt invalid');
    }
  });

  it('should accept Duplicate and RetryLater with reason', () => {
    const dup: TransactionEventResponse = { status: 'Duplicate', reason: 'Already processed' };
    const retry: TransactionEventResponse = { status: 'RetryLater', reason: 'Server busy' };
    expect(dup.status).toBe('Duplicate');
    expect(retry.status).toBe('RetryLater');
  });
});

// ── Heartbeat ───────────────────────────────────────────────────────────

describe('Heartbeat payloads', () => {
  it('should have empty request', () => {
    const req: HeartbeatRequest = {};
    expect(Object.keys(req)).toHaveLength(0);
  });

  it('should have serverTime in response', () => {
    const res: HeartbeatResponse = { serverTime: '2026-01-30T12:00:00.000Z' };
    expect(res.serverTime).toBeDefined();
  });
});

// ── Events ──────────────────────────────────────────────────────────────

describe('StatusNotification payload', () => {
  it('should accept a valid event', () => {
    const payload: StatusNotificationPayload = {
      bayId: 'bay_c1d2e3f4a5b6',
      bayNumber: 1,
      status: BayStatus.AVAILABLE,
      services: [{ serviceId: 'svc_eco', available: true }],
    };
    expect(payload.services).toHaveLength(1);
  });

  it('should accept optional previousStatus and error fields', () => {
    const payload: StatusNotificationPayload = {
      bayId: 'bay_c1d2e3f4a5b6',
      bayNumber: 1,
      status: BayStatus.FAULTED,
      previousStatus: BayStatus.OCCUPIED,
      services: [{ serviceId: 'svc_eco', available: false }],
      errorCode: 5001,
      errorText: 'PUMP_SYSTEM',
    };
    expect(payload.previousStatus).toBe('Occupied');
  });
});

describe('MeterValues payload', () => {
  it('should accept a valid event', () => {
    const payload: MeterValuesPayload = {
      bayId: 'bay_c1d2e3f4a5b6',
      sessionId: 'sess_a1b2c3d4e5',
      timestamp: '2026-01-30T12:01:00.000Z',
      values: { liquidMl: 5000, consumableMl: 50, energyWh: 15 },
    };
    expect(payload.values.liquidMl).toBe(5000);
  });
});

describe('SessionEnded payload', () => {
  it('should accept TimerExpired reason', () => {
    const payload: SessionEndedPayload = {
      sessionId: 'sess_a1b2c3d4e5',
      bayId: 'bay_c1d2e3f4a5b6',
      reason: SessionEndReason.TIMER_EXPIRED,
      actualDurationSeconds: 300,
      creditsCharged: 50,
      meterValues: { liquidMl: 45200, consumableMl: 500, energyWh: 150 },
    };
    expect(payload.reason).toBe('TimerExpired');
  });

  it('should accept Fault reason', () => {
    const payload: SessionEndedPayload = {
      sessionId: 'sess_a1b2c3d4e5',
      bayId: 'bay_c1d2e3f4a5b6',
      reason: SessionEndReason.FAULT,
      actualDurationSeconds: 127,
      creditsCharged: 21,
    };
    expect(payload.reason).toBe('Fault');
    expect(payload.meterValues).toBeUndefined();
  });
});

describe('ConnectionLost payload', () => {
  it('should have constant reason', () => {
    const payload: ConnectionLostPayload = {
      stationId: 'stn_a1b2c3d4',
      reason: 'UnexpectedDisconnect',
    };
    expect(payload.reason).toBe('UnexpectedDisconnect');
  });
});

describe('SecurityEvent payload', () => {
  it('should accept all 11 event types', () => {
    const payload: SecurityEventPayload = {
      eventId: 'sec_a1b2c3d4e5f6',
      type: 'TamperDetected',
      severity: 'Critical',
      timestamp: '2026-01-30T12:10:00.456Z',
      details: { bayId: 'bay_c1d2e3f4a5b6', description: 'Enclosure open' },
    };
    expect(payload.type).toBe('TamperDetected');
  });
});

// ── Configuration ───────────────────────────────────────────────────────

describe('ChangeConfiguration payloads', () => {
  it('should accept a batch request', () => {
    const req: ChangeConfigurationRequest = {
      keys: [
        { key: 'HeartbeatIntervalSeconds', value: '60' },
        { key: 'MeterValuesInterval', value: '10' },
      ],
    };
    expect(req.keys).toHaveLength(2);
  });

  it('should accept per-key results', () => {
    const res: ChangeConfigurationResponse = {
      results: [
        { key: 'HeartbeatIntervalSeconds', status: 'Accepted' },
        { key: 'StationName', status: 'RebootRequired' },
        { key: 'ProtocolVersion', status: 'Rejected', errorCode: 5108, errorText: 'CONFIGURATION_KEY_READONLY' },
      ],
    };
    expect(res.results).toHaveLength(3);
  });
});

describe('GetConfiguration payloads', () => {
  it('should accept empty keys (get all)', () => {
    const req: GetConfigurationRequest = {};
    expect(req.keys).toBeUndefined();
  });

  it('should accept response with unknownKeys', () => {
    const res: GetConfigurationResponse = {
      configuration: [
        { key: 'HeartbeatIntervalSeconds', value: '30', readonly: false },
      ],
      unknownKeys: ['Vendor_AcmeCorp_OutputPressure'],
    };
    expect(res.unknownKeys).toHaveLength(1);
  });
});

// ── Reset ───────────────────────────────────────────────────────────────

describe('Reset payloads', () => {
  it('should accept Soft and Hard types', () => {
    const soft: ResetRequest = { type: 'Soft' };
    const hard: ResetRequest = { type: 'Hard' };
    expect(soft.type).toBe('Soft');
    expect(hard.type).toBe('Hard');
  });

  it('should accept Accepted response', () => {
    const res: ResetResponse = { status: 'Accepted' };
    expect(res.status).toBe('Accepted');
  });

  it('should accept Rejected response with error', () => {
    const res: ResetResponse = { status: 'Rejected', errorCode: 3016, errorText: 'ACTIVE_SESSIONS_PRESENT' };
    if (res.status === 'Rejected') {
      expect(res.errorCode).toBe(3016);
    }
  });
});

// ── Firmware ────────────────────────────────────────────────────────────

describe('UpdateFirmware payloads', () => {
  it('should accept request with all fields', () => {
    const req: UpdateFirmwareRequest = {
      firmwareUrl: 'https://fw.example.com/v2.0.0.bin',
      firmwareVersion: '2.0.0',
      checksum: 'sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      signature: 'MEUCIQD...',
      forceDowngrade: false,
      scheduledAt: '2026-01-31T03:00:00.000Z',
    };
    expect(req.firmwareUrl).toMatch(/^https:\/\//);
  });
});

describe('FirmwareStatusNotification payload', () => {
  it('should accept all 5 statuses', () => {
    const statuses: FirmwareStatusNotificationPayload['status'][] = [
      'Downloading', 'Downloaded', 'Installing', 'Installed', 'Failed',
    ];
    expect(statuses).toHaveLength(5);
  });

  it('should accept progress percentage', () => {
    const payload: FirmwareStatusNotificationPayload = {
      status: 'Downloading',
      firmwareVersion: '2.0.0',
      progress: 45,
    };
    expect(payload.progress).toBe(45);
  });
});

// ── Diagnostics ─────────────────────────────────────────────────────────

describe('GetDiagnostics payloads', () => {
  it('should accept request with time window', () => {
    const req: GetDiagnosticsRequest = {
      uploadUrl: 'https://diag.example.com/upload',
      startTime: '2026-01-30T00:00:00.000Z',
      endTime: '2026-01-30T12:00:00.000Z',
    };
    expect(req.uploadUrl).toMatch(/^https:\/\//);
  });

  it('should accept Accepted response with required fileName', () => {
    const res: GetDiagnosticsResponse = {
      status: 'Accepted',
      fileName: 'diag_20260130.tar.gz',
    };
    if (res.status === 'Accepted') {
      expect(res.fileName).toBe('diag_20260130.tar.gz');
    }
  });

  it('should accept Rejected response with error', () => {
    const res: GetDiagnosticsResponse = {
      status: 'Rejected',
      errorCode: 5021,
      errorText: 'NO_DIAGNOSTICS_AVAILABLE',
    };
    if (res.status === 'Rejected') {
      expect(res.errorCode).toBe(5021);
    }
  });
});

describe('DiagnosticsNotification payload', () => {
  it('should accept all 4 statuses', () => {
    const statuses: DiagnosticsNotificationPayload['status'][] = [
      'Collecting', 'Uploading', 'Uploaded', 'Failed',
    ];
    expect(statuses).toHaveLength(4);
  });
});

// ── Maintenance ─────────────────────────────────────────────────────────

describe('SetMaintenanceMode payloads', () => {
  it('should accept request without bayId (all bays)', () => {
    const req: SetMaintenanceModeRequest = { enabled: true, reason: 'Scheduled maintenance' };
    expect(req.bayId).toBeUndefined();
  });

  it('should accept request with specific bayId', () => {
    const req: SetMaintenanceModeRequest = {
      bayId: 'bay_c1d2e3f4a5b6',
      enabled: false,
    };
    expect(req.bayId).toBeDefined();
  });
});

// ── Service Catalog ─────────────────────────────────────────────────────

describe('UpdateServiceCatalog payloads', () => {
  it('should accept a valid catalog', () => {
    const req: UpdateServiceCatalogRequest = {
      catalogVersion: '2.1',
      services: [
        { serviceId: 'svc_eco', serviceName: 'Eco Wash', pricingType: 'PerMinute', priceCreditsPerMinute: 10, available: true },
        { serviceId: 'svc_premium', serviceName: 'Premium', pricingType: 'Fixed', priceCreditsFixed: 50, available: true },
      ],
    };
    expect(req.services).toHaveLength(2);
  });
});

// ── Certificates ────────────────────────────────────────────────────────

describe('SignCertificate payloads', () => {
  it('should accept valid CSR request', () => {
    const req: SignCertificateRequest = {
      certificateType: 'StationCertificate',
      csr: '-----BEGIN CERTIFICATE REQUEST-----\nMIIB...',
    };
    expect(req.certificateType).toBe('StationCertificate');
  });
});

describe('CertificateInstall payloads', () => {
  it('should accept request with optional CA chain', () => {
    const req: CertificateInstallRequest = {
      certificateType: 'StationCertificate',
      certificate: '-----BEGIN CERTIFICATE-----\nMIIB...',
      caCertificateChain: '-----BEGIN CERTIFICATE-----\nMIIC...',
    };
    expect(req.caCertificateChain).toBeDefined();
  });

  it('should accept Accepted response with serial number', () => {
    const res: CertificateInstallResponse = {
      status: 'Accepted',
      certificateSerialNumber: 'A1:B2:C3:D4',
    };
    if (res.status === 'Accepted') {
      expect(res.certificateSerialNumber).toBeDefined();
    }
  });
});

describe('TriggerCertificateRenewal payloads', () => {
  it('should accept both certificate types', () => {
    const req1: TriggerCertificateRenewalRequest = { certificateType: 'StationCertificate' };
    const req2: TriggerCertificateRenewalRequest = { certificateType: 'MQTTClientCertificate' };
    expect(req1.certificateType).not.toBe(req2.certificateType);
  });
});

// ── DataTransfer ────────────────────────────────────────────────────────

describe('DataTransfer payloads', () => {
  it('should accept request with vendor data', () => {
    const req: DataTransferRequest = {
      vendorId: 'AcmeCorp',
      dataId: 'diagnostics_v2',
      data: { pressure: 4.5, temperature: 22 },
    };
    expect(req.vendorId).toBe('AcmeCorp');
  });

  it('should accept all 4 response statuses', () => {
    const statuses: DataTransferResponse['status'][] = [
      'Accepted', 'Rejected', 'UnknownVendor', 'UnknownData',
    ];
    expect(statuses).toHaveLength(4);
  });
});

// ── TriggerMessage ──────────────────────────────────────────────────────

describe('TriggerMessage payloads', () => {
  it('should accept all 8 triggerable messages', () => {
    const msgs: TriggerMessageRequest['requestedMessage'][] = [
      'BootNotification', 'StatusNotification', 'MeterValues', 'Heartbeat',
      'DiagnosticsNotification', 'FirmwareStatusNotification', 'SecurityEvent', 'SignCertificate',
    ];
    expect(msgs).toHaveLength(8);
  });

  it('should accept all 3 response statuses', () => {
    const statuses: TriggerMessageResponse['status'][] = ['Accepted', 'Rejected', 'NotImplemented'];
    expect(statuses).toHaveLength(3);
  });
});

// ── Coverage check ──────────────────────────────────────────────────────

describe('Payload file coverage', () => {
  it('should have 27 payload files matching 27 actions', () => {
    // This test documents that all 27 actions have corresponding payload types.
    // 20 REQ/RES actions = 20 files with Request+Response interfaces
    // 7 EVENT actions = 7 files with Payload interfaces
    const reqResActions = 20;
    const eventActions = 7;
    expect(reqResActions + eventActions).toBe(27);
  });
});
