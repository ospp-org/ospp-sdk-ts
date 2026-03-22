import { describe, it, expect } from 'vitest';
import {
  type OsppEnvelope,
  OSPP_PROTOCOL_VERSION,
  createEnvelope,
} from '../../src/types/envelope';
import { OsppAction } from '../../src/actions/OsppAction';
import { MessageType } from '../../src/enums/MessageType';
import { MessageSource } from '../../src/enums/MessageSource';

describe('OsppEnvelope', () => {
  it('should be assignable with all required fields', () => {
    const envelope: OsppEnvelope<{ status: string }> = {
      messageId: 'boot_a1b2c3d4',
      messageType: MessageType.REQUEST,
      action: OsppAction.BOOT_NOTIFICATION,
      timestamp: '2026-01-30T12:00:00.000Z',
      source: MessageSource.STATION,
      protocolVersion: '0.2.1',
      payload: { status: 'ok' },
    };

    expect(envelope.messageId).toBe('boot_a1b2c3d4');
    expect(envelope.messageType).toBe('Request');
    expect(envelope.action).toBe('BootNotification');
    expect(envelope.source).toBe('Station');
    expect(envelope.mac).toBeUndefined();
  });

  it('should accept optional mac field', () => {
    const envelope: OsppEnvelope<Record<string, never>> = {
      messageId: 'cmd_123',
      messageType: MessageType.REQUEST,
      action: OsppAction.START_SERVICE,
      timestamp: '2026-01-30T12:00:00.000Z',
      source: MessageSource.SERVER,
      protocolVersion: '0.2.1',
      payload: {},
      mac: 'dGVzdA==',
    };

    expect(envelope.mac).toBe('dGVzdA==');
  });
});

describe('OSPP_PROTOCOL_VERSION', () => {
  it('should be 0.2.1', () => {
    expect(OSPP_PROTOCOL_VERSION).toBe('0.2.1');
  });

  it('should match semver pattern', () => {
    expect(OSPP_PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('createEnvelope', () => {
  it('should create an envelope with all explicit fields', () => {
    const envelope = createEnvelope({
      messageId: 'hb_abc123',
      messageType: MessageType.REQUEST,
      action: OsppAction.HEARTBEAT,
      source: MessageSource.STATION,
      payload: {},
      timestamp: '2026-03-01T10:00:00.000Z',
      protocolVersion: '0.2.1',
    });

    expect(envelope.messageId).toBe('hb_abc123');
    expect(envelope.messageType).toBe('Request');
    expect(envelope.action).toBe('Heartbeat');
    expect(envelope.timestamp).toBe('2026-03-01T10:00:00.000Z');
    expect(envelope.source).toBe('Station');
    expect(envelope.protocolVersion).toBe('0.2.1');
    expect(envelope.payload).toEqual({});
    expect(envelope.mac).toBeUndefined();
  });

  it('should default protocolVersion to OSPP_PROTOCOL_VERSION', () => {
    const envelope = createEnvelope({
      messageId: 'test_1',
      messageType: MessageType.EVENT,
      action: OsppAction.STATUS_NOTIFICATION,
      source: MessageSource.STATION,
      payload: {},
    });

    expect(envelope.protocolVersion).toBe(OSPP_PROTOCOL_VERSION);
  });

  it('should default timestamp to current UTC', () => {
    const before = new Date().toISOString();
    const envelope = createEnvelope({
      messageId: 'test_2',
      messageType: MessageType.EVENT,
      action: OsppAction.METER_VALUES,
      source: MessageSource.STATION,
      payload: {},
    });
    const after = new Date().toISOString();

    // Timestamp should be a valid ISO 8601 string between before and after
    expect(envelope.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(envelope.timestamp >= before.slice(0, 19)).toBe(true);
    expect(envelope.timestamp <= after.slice(0, 19) + 'Z').toBe(true);
  });

  it('should include mac when provided', () => {
    const envelope = createEnvelope({
      messageId: 'cmd_1',
      messageType: MessageType.REQUEST,
      action: OsppAction.START_SERVICE,
      source: MessageSource.SERVER,
      payload: { sessionId: 'sess_abc' },
      mac: 'base64mac==',
    });

    expect(envelope.mac).toBe('base64mac==');
  });

  it('should omit mac key entirely when not provided', () => {
    const envelope = createEnvelope({
      messageId: 'cmd_2',
      messageType: MessageType.REQUEST,
      action: OsppAction.HEARTBEAT,
      source: MessageSource.STATION,
      payload: {},
    });

    expect('mac' in envelope).toBe(false);
  });

  it('should preserve typed payload', () => {
    interface BootPayload {
      stationId: string;
      firmwareVersion: string;
    }

    const envelope = createEnvelope<BootPayload>({
      messageId: 'boot_1',
      messageType: MessageType.REQUEST,
      action: OsppAction.BOOT_NOTIFICATION,
      source: MessageSource.STATION,
      payload: {
        stationId: 'stn_a1b2c3d4',
        firmwareVersion: '1.2.3',
      },
    });

    expect(envelope.payload.stationId).toBe('stn_a1b2c3d4');
    expect(envelope.payload.firmwareVersion).toBe('1.2.3');
  });
});
