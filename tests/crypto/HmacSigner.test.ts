import { describe, it, expect } from 'vitest';
import { randomBytes, createHmac } from 'crypto';
import { computeMac, verifyMac, signMessage } from '../../src/crypto/HmacSigner';
import { canonicalize } from '../../src/crypto/CanonicalJsonSerializer';

// Generate a valid 32-byte session key (base64)
const SESSION_KEY = randomBytes(32).toString('base64');

const SAMPLE_MESSAGE = {
  messageId: 'cmd_550e8400',
  messageType: 'Request',
  action: 'StartService',
  timestamp: '2026-01-30T12:00:00.000Z',
  source: 'Server',
  protocolVersion: '0.2.1',
  payload: { sessionId: 'sess_a1b2c3d4', bayId: 'bay_c1d2e3f4a5b6' },
};

describe('computeMac', () => {
  it('should return a base64 string', () => {
    const mac = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    expect(mac).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should produce a 32-byte (256-bit) HMAC', () => {
    const mac = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    const bytes = Buffer.from(mac, 'base64');
    expect(bytes.length).toBe(32);
  });

  it('should be deterministic', () => {
    const mac1 = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    const mac2 = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    expect(mac1).toBe(mac2);
  });

  it('should ignore existing mac field in input', () => {
    const withMac = { ...SAMPLE_MESSAGE, mac: 'old-mac-value' };
    const withoutMac = { ...SAMPLE_MESSAGE };
    expect(computeMac(SESSION_KEY, withMac)).toBe(computeMac(SESSION_KEY, withoutMac));
  });

  it('should differ with different keys', () => {
    const otherKey = randomBytes(32).toString('base64');
    const mac1 = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    const mac2 = computeMac(otherKey, SAMPLE_MESSAGE);
    expect(mac1).not.toBe(mac2);
  });

  it('should differ with different messages', () => {
    const other = { ...SAMPLE_MESSAGE, messageId: 'cmd_different' };
    const mac1 = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    const mac2 = computeMac(SESSION_KEY, other);
    expect(mac1).not.toBe(mac2);
  });

  it('should match manual HMAC-SHA256 computation', () => {
    const canonical = canonicalize(SAMPLE_MESSAGE);
    const keyBytes = Buffer.from(SESSION_KEY, 'base64');
    const expected = createHmac('sha256', keyBytes)
      .update(Buffer.from(canonical, 'utf-8'))
      .digest('base64');

    expect(computeMac(SESSION_KEY, SAMPLE_MESSAGE)).toBe(expected);
  });
});

describe('verifyMac', () => {
  it('should return true for a valid MAC', () => {
    const mac = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    const signed = { ...SAMPLE_MESSAGE, mac };
    expect(verifyMac(SESSION_KEY, signed)).toBe(true);
  });

  it('should return false for a tampered MAC', () => {
    const mac = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    const tampered = mac.slice(0, -2) + 'XX';
    const signed = { ...SAMPLE_MESSAGE, mac: tampered };
    expect(verifyMac(SESSION_KEY, signed)).toBe(false);
  });

  it('should return false for a tampered message', () => {
    const mac = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    const tampered = { ...SAMPLE_MESSAGE, messageId: 'cmd_tampered', mac };
    expect(verifyMac(SESSION_KEY, tampered)).toBe(false);
  });

  it('should return false for wrong key', () => {
    const mac = computeMac(SESSION_KEY, SAMPLE_MESSAGE);
    const signed = { ...SAMPLE_MESSAGE, mac };
    const wrongKey = randomBytes(32).toString('base64');
    expect(verifyMac(wrongKey, signed)).toBe(false);
  });

  it('should return false when mac field is missing', () => {
    expect(verifyMac(SESSION_KEY, SAMPLE_MESSAGE)).toBe(false);
  });

  it('should return false when mac field is not a string', () => {
    const msg = { ...SAMPLE_MESSAGE, mac: 12345 } as unknown as Record<string, unknown>;
    expect(verifyMac(SESSION_KEY, msg)).toBe(false);
  });
});

describe('signMessage', () => {
  it('should add mac field to message', () => {
    const signed = signMessage(SESSION_KEY, SAMPLE_MESSAGE);
    expect(signed.mac).toBeDefined();
    expect(typeof signed.mac).toBe('string');
  });

  it('should produce a verifiable message', () => {
    const signed = signMessage(SESSION_KEY, SAMPLE_MESSAGE);
    expect(verifyMac(SESSION_KEY, signed)).toBe(true);
  });

  it('should not mutate the original message', () => {
    const original = { ...SAMPLE_MESSAGE };
    signMessage(SESSION_KEY, original);
    expect('mac' in original).toBe(false);
  });

  it('should roundtrip: sign then verify', () => {
    const messages = [
      SAMPLE_MESSAGE,
      { messageId: 'hb_1', messageType: 'Request', action: 'Heartbeat', timestamp: '2026-01-30T12:00:00.000Z', source: 'Station', protocolVersion: '0.2.1', payload: {} },
      { messageId: 'evt_1', messageType: 'Event', action: 'StatusNotification', timestamp: '2026-01-30T12:00:00.000Z', source: 'Station', protocolVersion: '0.2.1', payload: { bayId: 'bay_1', status: 'Available' } },
    ];

    for (const msg of messages) {
      const signed = signMessage(SESSION_KEY, msg);
      expect(verifyMac(SESSION_KEY, signed)).toBe(true);
    }
  });
});
