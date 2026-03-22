import { describe, it, expect } from 'vitest';
import {
  ConfigKey,
  CONFIG_KEY_REGISTRY,
  type ConfigProfile,
} from '../../src/enums/ConfigKey';

describe('ConfigKey', () => {
  const allKeys = Object.values(ConfigKey);

  it('should have exactly 41 keys', () => {
    expect(allKeys).toHaveLength(41);
  });

  it('should have unique PascalCase string values', () => {
    expect(new Set(allKeys).size).toBe(allKeys.length);

    for (const key of allKeys) {
      expect(key).toMatch(/^[A-Z]/);
    }
  });

  describe('profile distribution', () => {
    const byProfile = (profile: ConfigProfile) =>
      Object.values(CONFIG_KEY_REGISTRY).filter((m) => m.profile === profile);

    it('should have 12 Core keys', () => {
      expect(byProfile('Core')).toHaveLength(12);
    });

    it('should have 6 Transaction keys', () => {
      expect(byProfile('Transaction')).toHaveLength(6);
    });

    it('should have 7 Security keys', () => {
      expect(byProfile('Security')).toHaveLength(7);
    });

    it('should have 12 Offline/BLE keys', () => {
      expect(byProfile('OfflineBLE')).toHaveLength(12);
    });

    it('should have 4 Device Management keys', () => {
      expect(byProfile('DeviceMgmt')).toHaveLength(4);
    });

    it('12 + 6 + 7 + 12 + 4 = 41', () => {
      expect(12 + 6 + 7 + 12 + 4).toBe(41);
    });
  });
});

describe('CONFIG_KEY_REGISTRY', () => {
  const allKeys = Object.values(ConfigKey);

  it('should have an entry for every ConfigKey', () => {
    for (const key of allKeys) {
      const entry = CONFIG_KEY_REGISTRY[key];
      expect(entry, `missing registry entry for ${key}`).toBeDefined();
    }
  });

  it('should have key field matching the enum value', () => {
    for (const key of allKeys) {
      expect(CONFIG_KEY_REGISTRY[key].key).toBe(key);
    }
  });

  describe('access modes', () => {
    it('ProtocolVersion should be ReadOnly', () => {
      expect(CONFIG_KEY_REGISTRY[ConfigKey.PROTOCOL_VERSION].access).toBe('R');
    });

    it('FirmwareVersion should be ReadOnly', () => {
      expect(CONFIG_KEY_REGISTRY[ConfigKey.FIRMWARE_VERSION].access).toBe('R');
    });

    it('CertificateSerialNumber should be ReadOnly', () => {
      expect(CONFIG_KEY_REGISTRY[ConfigKey.CERTIFICATE_SERIAL_NUMBER].access).toBe('R');
    });

    it('OfflinePassPublicKey should be WriteOnly', () => {
      expect(CONFIG_KEY_REGISTRY[ConfigKey.OFFLINE_PASS_PUBLIC_KEY].access).toBe('W');
    });

    it('HeartbeatIntervalSeconds should be ReadWrite', () => {
      expect(CONFIG_KEY_REGISTRY[ConfigKey.HEARTBEAT_INTERVAL_SECONDS].access).toBe('RW');
    });
  });

  describe('mutability', () => {
    const staticKeys = [
      ConfigKey.STATION_NAME,
      ConfigKey.TIME_ZONE,
      ConfigKey.PROTOCOL_VERSION,
      ConfigKey.FIRMWARE_VERSION,
      ConfigKey.SECURITY_PROFILE,
      ConfigKey.CERTIFICATE_SERIAL_NUMBER,
      ConfigKey.DIAGNOSTICS_UPLOAD_URL,
    ];

    for (const key of staticKeys) {
      it(`${key} should be Static`, () => {
        expect(CONFIG_KEY_REGISTRY[key].mutability).toBe('Static');
      });
    }

    it('HeartbeatIntervalSeconds should be Dynamic', () => {
      expect(
        CONFIG_KEY_REGISTRY[ConfigKey.HEARTBEAT_INTERVAL_SECONDS].mutability,
      ).toBe('Dynamic');
    });
  });

  describe('default values from spec', () => {
    const checks: [ConfigKey, string | null][] = [
      [ConfigKey.HEARTBEAT_INTERVAL_SECONDS, '30'],
      [ConfigKey.CONNECTION_TIMEOUT, '60'],
      [ConfigKey.LOCALE, 'en-US'],
      [ConfigKey.METER_VALUES_INTERVAL, '15'],
      [ConfigKey.MAX_SESSION_DURATION_SECONDS, '600'],
      [ConfigKey.RESERVATION_DEFAULT_TTL, '180'],
      [ConfigKey.SECURITY_PROFILE, '2'],
      [ConfigKey.MESSAGE_SIGNING_MODE, 'Critical'],
      [ConfigKey.BLE_MTU_PREFERRED, '247'],
      [ConfigKey.LOG_LEVEL, 'Info'],
      [ConfigKey.AUTO_REBOOT_ENABLED, 'false'],
      [ConfigKey.FIRMWARE_VERSION, null],
      [ConfigKey.CERTIFICATE_SERIAL_NUMBER, null],
      [ConfigKey.OFFLINE_PASS_PUBLIC_KEY, null],
    ];

    for (const [key, expected] of checks) {
      it(`${key} default should be ${expected === null ? 'null' : `"${expected}"`}`, () => {
        expect(CONFIG_KEY_REGISTRY[key].defaultValue).toBe(expected);
      });
    }
  });

  describe('value types', () => {
    it('HeartbeatIntervalSeconds should be integer', () => {
      expect(CONFIG_KEY_REGISTRY[ConfigKey.HEARTBEAT_INTERVAL_SECONDS].valueType).toBe('integer');
    });

    it('StationName should be string', () => {
      expect(CONFIG_KEY_REGISTRY[ConfigKey.STATION_NAME].valueType).toBe('string');
    });

    it('AuthorizationCacheEnabled should be boolean', () => {
      expect(CONFIG_KEY_REGISTRY[ConfigKey.AUTHORIZATION_CACHE_ENABLED].valueType).toBe('boolean');
    });
  });
});
