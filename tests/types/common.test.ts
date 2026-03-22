import { describe, it, expect } from 'vitest';
import type {
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
  OfflinePass,
  OfflineAllowance,
  OfflineConstraints,
  SessionSource,
  ConnectionType,
  NetworkInfo,
  StationCapabilities,
  PricingType,
} from '../../src/types/common';

describe('ID type patterns', () => {
  // These tests verify that valid IDs match the spec patterns.
  // The types are string aliases — runtime validation is in SchemaValidator.

  const patterns: [string, RegExp, string][] = [
    ['StationId',      /^stn_[a-f0-9]{8,}$/,   'stn_a1b2c3d4'],
    ['SessionId',      /^sess_[a-f0-9]{8,}$/,   'sess_a1b2c3d4e5'],
    ['BayId',          /^bay_[a-f0-9]{8,}$/,     'bay_c1d2e3f4a5b6'],
    ['ReservationId',  /^rsv_[a-f0-9]{8,}$/,     'rsv_a1b2c3d4e5f6'],
    ['ServiceId',      /^svc_[a-z0-9_]+$/,       'svc_eco_wash'],
    ['OfflinePassId',  /^opass_[a-f0-9]{8,}$/,   'opass_a1b2c3d4e5f6'],
    ['OfflineTxId',    /^otx_[a-f0-9]{8,}$/,     'otx_a1b2c3d4e5f6'],
    ['UserId',         /^sub_[a-zA-Z0-9]+$/,     'sub_abc123'],
  ];

  for (const [name, pattern, example] of patterns) {
    it(`${name} example "${example}" should match pattern`, () => {
      expect(example).toMatch(pattern);
    });
  }
});

describe('Timestamp', () => {
  it('should match ISO 8601 UTC with milliseconds', () => {
    const ts: Timestamp = '2026-01-30T12:00:00.000Z';
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('MeterValues', () => {
  it('should allow all fields optional', () => {
    const empty: MeterValues = {};
    expect(empty).toEqual({});
  });

  it('should accept all three meter fields', () => {
    const full: MeterValues = {
      liquidMl: 45200,
      consumableMl: 500,
      energyWh: 150,
    };
    expect(full.liquidMl).toBe(45200);
    expect(full.consumableMl).toBe(500);
    expect(full.energyWh).toBe(150);
  });
});

describe('Receipt', () => {
  it('should require all three fields', () => {
    const receipt: Receipt = {
      data: 'eyJzZXNzaW9uSWQiOiJ4In0=',
      signature: 'MEUCIQD...',
      signatureAlgorithm: 'ECDSA-P256-SHA256',
    };
    expect(receipt.signatureAlgorithm).toBe('ECDSA-P256-SHA256');
  });
});

describe('ServiceItem', () => {
  it('should accept a PerMinute service', () => {
    const svc: ServiceItem = {
      serviceId: 'svc_eco',
      serviceName: 'Eco Wash',
      pricingType: 'PerMinute',
      priceCreditsPerMinute: 10,
      available: true,
    };
    expect(svc.pricingType).toBe('PerMinute');
    expect(svc.priceCreditsPerMinute).toBe(10);
  });

  it('should accept a Fixed service', () => {
    const svc: ServiceItem = {
      serviceId: 'svc_premium',
      serviceName: 'Premium Wash',
      pricingType: 'Fixed',
      priceCreditsFixed: 50,
      available: false,
    };
    expect(svc.pricingType).toBe('Fixed');
    expect(svc.priceCreditsFixed).toBe(50);
  });

  it('should accept optional local currency pricing', () => {
    const svc: ServiceItem = {
      serviceId: 'svc_basic',
      serviceName: 'Basic Wash',
      pricingType: 'PerMinute',
      priceCreditsPerMinute: 5,
      priceLocalPerMinute: 100,
      available: true,
    };
    expect(svc.priceLocalPerMinute).toBe(100);
  });
});

describe('OfflinePass', () => {
  const pass: OfflinePass = {
    passId: 'opass_a1b2c3d4e5f6',
    sub: 'sub_user123',
    deviceId: 'device_abc',
    issuedAt: '2026-01-30T10:00:00.000Z',
    expiresAt: '2026-01-31T10:00:00.000Z',
    policyVersion: 1,
    revocationEpoch: 5,
    offlineAllowance: {
      maxTotalCredits: 500,
      maxUses: 10,
      maxCreditsPerTx: 100,
      allowedServiceTypes: ['svc_eco', 'svc_basic'],
    },
    constraints: {
      minIntervalSec: 60,
      stationOfflineWindowHours: 24,
      stationMaxOfflineTx: 50,
    },
    signatureAlgorithm: 'ECDSA-P256-SHA256',
    signature: 'MEUCIQD...',
  };

  it('should have all required fields', () => {
    expect(pass.passId).toMatch(/^opass_/);
    expect(pass.sub).toMatch(/^sub_/);
    expect(pass.signatureAlgorithm).toBe('ECDSA-P256-SHA256');
  });

  it('should have valid offlineAllowance', () => {
    expect(pass.offlineAllowance.maxTotalCredits).toBe(500);
    expect(pass.offlineAllowance.maxUses).toBe(10);
    expect(pass.offlineAllowance.maxCreditsPerTx).toBe(100);
    expect(pass.offlineAllowance.allowedServiceTypes).toHaveLength(2);
  });

  it('should have valid constraints', () => {
    expect(pass.constraints.minIntervalSec).toBe(60);
    expect(pass.constraints.stationOfflineWindowHours).toBe(24);
    expect(pass.constraints.stationMaxOfflineTx).toBe(50);
  });
});

describe('SessionSource', () => {
  it('should accept MobileApp and WebPayment', () => {
    const sources: SessionSource[] = ['MobileApp', 'WebPayment'];
    expect(sources).toHaveLength(2);
  });
});

describe('NetworkInfo', () => {
  it('should accept Ethernet without signal strength', () => {
    const info: NetworkInfo = { connectionType: 'Ethernet' };
    expect(info.signalStrength).toBeUndefined();
  });

  it('should accept Cellular with signal strength', () => {
    const info: NetworkInfo = { connectionType: 'Cellular', signalStrength: -67 };
    expect(info.signalStrength).toBe(-67);
  });

  it('should accept Wifi', () => {
    const info: NetworkInfo = { connectionType: 'Wifi', signalStrength: -45 };
    expect(info.connectionType).toBe('Wifi');
  });
});

describe('StationCapabilities', () => {
  it('should accept all required fields', () => {
    const caps: StationCapabilities = {
      bleSupported: true,
      offlineModeSupported: true,
      meterValuesSupported: false,
    };
    expect(caps.bleSupported).toBe(true);
    expect(caps.deviceManagementSupported).toBeUndefined();
  });

  it('should accept optional deviceManagementSupported', () => {
    const caps: StationCapabilities = {
      bleSupported: false,
      offlineModeSupported: false,
      meterValuesSupported: true,
      deviceManagementSupported: true,
    };
    expect(caps.deviceManagementSupported).toBe(true);
  });
});

describe('PricingType', () => {
  it('should accept PerMinute and Fixed', () => {
    const types: PricingType[] = ['PerMinute', 'Fixed'];
    expect(types).toHaveLength(2);
  });
});
