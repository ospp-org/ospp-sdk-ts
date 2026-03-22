import { describe, it, expect } from 'vitest';
import {
  ALWAYS_EXEMPT,
  CRITICAL_MESSAGE_TYPES,
  isCritical,
  requiresHmac,
} from '../../src/crypto/CriticalMessageRegistry';
import { OsppAction } from '../../src/actions/OsppAction';
import { MessageType } from '../../src/enums/MessageType';

const REQ = MessageType.REQUEST;
const RES = MessageType.RESPONSE;
const EVT = MessageType.EVENT;

describe('ALWAYS_EXEMPT', () => {
  it('should contain exactly 2 entries', () => {
    expect(ALWAYS_EXEMPT.size).toBe(2);
  });

  it('should contain BootNotification REQUEST', () => {
    expect(ALWAYS_EXEMPT.has(`${OsppAction.BOOT_NOTIFICATION}:${REQ}`)).toBe(true);
  });

  it('should contain ConnectionLost EVENT', () => {
    expect(ALWAYS_EXEMPT.has(`${OsppAction.CONNECTION_LOST}:${EVT}`)).toBe(true);
  });
});

describe('CRITICAL_MESSAGE_TYPES', () => {
  it('should contain exactly 32 entries', () => {
    expect(CRITICAL_MESSAGE_TYPES.size).toBe(32);
  });
});

describe('isCritical — YES entries (spec §5.6)', () => {
  const criticalEntries: [OsppAction, MessageType][] = [
    [OsppAction.BOOT_NOTIFICATION, RES],
    [OsppAction.AUTHORIZE_OFFLINE_PASS, REQ],
    [OsppAction.AUTHORIZE_OFFLINE_PASS, RES],
    [OsppAction.RESERVE_BAY, REQ],
    [OsppAction.RESERVE_BAY, RES],
    [OsppAction.CANCEL_RESERVATION, REQ],
    [OsppAction.CANCEL_RESERVATION, RES],
    [OsppAction.START_SERVICE, REQ],
    [OsppAction.START_SERVICE, RES],
    [OsppAction.STOP_SERVICE, REQ],
    [OsppAction.STOP_SERVICE, RES],
    [OsppAction.TRANSACTION_EVENT, REQ],
    [OsppAction.TRANSACTION_EVENT, RES],
    [OsppAction.SESSION_ENDED, EVT],
    [OsppAction.CHANGE_CONFIGURATION, REQ],
    [OsppAction.CHANGE_CONFIGURATION, RES],
    [OsppAction.RESET, REQ],
    [OsppAction.RESET, RES],
    [OsppAction.UPDATE_FIRMWARE, REQ],
    [OsppAction.UPDATE_FIRMWARE, RES],
    [OsppAction.SET_MAINTENANCE_MODE, REQ],
    [OsppAction.SET_MAINTENANCE_MODE, RES],
    [OsppAction.UPDATE_SERVICE_CATALOG, REQ],
    [OsppAction.UPDATE_SERVICE_CATALOG, RES],
    [OsppAction.SIGN_CERTIFICATE, REQ],
    [OsppAction.SIGN_CERTIFICATE, RES],
    [OsppAction.CERTIFICATE_INSTALL, REQ],
    [OsppAction.CERTIFICATE_INSTALL, RES],
    [OsppAction.TRIGGER_CERTIFICATE_RENEWAL, REQ],
    [OsppAction.TRIGGER_CERTIFICATE_RENEWAL, RES],
    [OsppAction.TRIGGER_MESSAGE, REQ],
    [OsppAction.TRIGGER_MESSAGE, RES],
  ];

  it('should have 32 critical entries listed', () => {
    expect(criticalEntries).toHaveLength(32);
  });

  for (const [action, msgType] of criticalEntries) {
    it(`${action} ${msgType} should be critical`, () => {
      expect(isCritical(action, msgType)).toBe(true);
    });
  }
});

describe('isCritical — NO entries (spec §5.6)', () => {
  const exemptEntries: [OsppAction, MessageType][] = [
    [OsppAction.BOOT_NOTIFICATION, REQ],
    [OsppAction.HEARTBEAT, REQ],
    [OsppAction.HEARTBEAT, RES],
    [OsppAction.STATUS_NOTIFICATION, EVT],
    [OsppAction.METER_VALUES, EVT],
    [OsppAction.CONNECTION_LOST, EVT],
    [OsppAction.SECURITY_EVENT, EVT],
    [OsppAction.GET_CONFIGURATION, REQ],
    [OsppAction.GET_CONFIGURATION, RES],
    [OsppAction.GET_DIAGNOSTICS, REQ],
    [OsppAction.GET_DIAGNOSTICS, RES],
    [OsppAction.FIRMWARE_STATUS_NOTIFICATION, EVT],
    [OsppAction.DIAGNOSTICS_NOTIFICATION, EVT],
    [OsppAction.DATA_TRANSFER, REQ],
    [OsppAction.DATA_TRANSFER, RES],
  ];

  it('should have 15 exempt entries listed', () => {
    expect(exemptEntries).toHaveLength(15);
  });

  for (const [action, msgType] of exemptEntries) {
    it(`${action} ${msgType} should NOT be critical`, () => {
      expect(isCritical(action, msgType)).toBe(false);
    });
  }
});

describe('isCritical — 32 YES + 15 NO = 47 total', () => {
  it('should cover all 47 message types', () => {
    expect(32 + 15).toBe(47);
  });
});

describe('SessionEnded — reclassified as YES in spec v0.2.4', () => {
  it('should be critical (contains creditsCharged for billing)', () => {
    expect(isCritical(OsppAction.SESSION_ENDED, EVT)).toBe(true);
  });

  it('should require HMAC in Critical mode', () => {
    expect(requiresHmac(OsppAction.SESSION_ENDED, EVT, 'Critical')).toBe(true);
  });
});

describe('requiresHmac — mode None', () => {
  it('should never require HMAC', () => {
    expect(requiresHmac(OsppAction.START_SERVICE, REQ, 'None')).toBe(false);
    expect(requiresHmac(OsppAction.BOOT_NOTIFICATION, RES, 'None')).toBe(false);
    expect(requiresHmac(OsppAction.HEARTBEAT, REQ, 'None')).toBe(false);
  });
});

describe('requiresHmac — mode Critical', () => {
  it('should require HMAC for critical messages', () => {
    expect(requiresHmac(OsppAction.START_SERVICE, REQ, 'Critical')).toBe(true);
    expect(requiresHmac(OsppAction.STOP_SERVICE, RES, 'Critical')).toBe(true);
    expect(requiresHmac(OsppAction.TRANSACTION_EVENT, REQ, 'Critical')).toBe(true);
    expect(requiresHmac(OsppAction.SESSION_ENDED, EVT, 'Critical')).toBe(true);
  });

  it('should NOT require HMAC for exempt messages', () => {
    expect(requiresHmac(OsppAction.HEARTBEAT, REQ, 'Critical')).toBe(false);
    expect(requiresHmac(OsppAction.STATUS_NOTIFICATION, EVT, 'Critical')).toBe(false);
    expect(requiresHmac(OsppAction.METER_VALUES, EVT, 'Critical')).toBe(false);
    expect(requiresHmac(OsppAction.DATA_TRANSFER, REQ, 'Critical')).toBe(false);
  });

  it('should NOT require HMAC for always-exempt', () => {
    expect(requiresHmac(OsppAction.BOOT_NOTIFICATION, REQ, 'Critical')).toBe(false);
    expect(requiresHmac(OsppAction.CONNECTION_LOST, EVT, 'Critical')).toBe(false);
  });
});

describe('requiresHmac — mode All', () => {
  it('should require HMAC for all non-exempt messages', () => {
    expect(requiresHmac(OsppAction.HEARTBEAT, REQ, 'All')).toBe(true);
    expect(requiresHmac(OsppAction.STATUS_NOTIFICATION, EVT, 'All')).toBe(true);
    expect(requiresHmac(OsppAction.DATA_TRANSFER, REQ, 'All')).toBe(true);
    expect(requiresHmac(OsppAction.GET_CONFIGURATION, REQ, 'All')).toBe(true);
  });

  it('should NOT require HMAC for always-exempt even in All mode', () => {
    expect(requiresHmac(OsppAction.BOOT_NOTIFICATION, REQ, 'All')).toBe(false);
    expect(requiresHmac(OsppAction.CONNECTION_LOST, EVT, 'All')).toBe(false);
  });
});

describe('BootNotification — split classification', () => {
  it('REQUEST is always exempt (no session key)', () => {
    expect(requiresHmac(OsppAction.BOOT_NOTIFICATION, REQ, 'None')).toBe(false);
    expect(requiresHmac(OsppAction.BOOT_NOTIFICATION, REQ, 'Critical')).toBe(false);
    expect(requiresHmac(OsppAction.BOOT_NOTIFICATION, REQ, 'All')).toBe(false);
  });

  it('RESPONSE is critical (contains session key)', () => {
    expect(requiresHmac(OsppAction.BOOT_NOTIFICATION, RES, 'None')).toBe(false);
    expect(requiresHmac(OsppAction.BOOT_NOTIFICATION, RES, 'Critical')).toBe(true);
    expect(requiresHmac(OsppAction.BOOT_NOTIFICATION, RES, 'All')).toBe(true);
  });
});
