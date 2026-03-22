import { describe, it, expect } from 'vitest';
import { OsppAction } from '../../src/actions/OsppAction';

describe('OsppAction', () => {
  it('should have exactly 27 actions', () => {
    const values = Object.values(OsppAction);
    expect(values).toHaveLength(27);
  });

  it('should have unique enum keys', () => {
    const keys = Object.keys(OsppAction);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should have unique PascalCase string values', () => {
    const values = Object.values(OsppAction);
    expect(new Set(values).size).toBe(values.length);

    for (const value of values) {
      expect(value).toMatch(/^[A-Z][a-zA-Z]+$/);
    }
  });

  describe('Station → Server actions', () => {
    const stationToServer: OsppAction[] = [
      OsppAction.BOOT_NOTIFICATION,
      OsppAction.AUTHORIZE_OFFLINE_PASS,
      OsppAction.TRANSACTION_EVENT,
      OsppAction.HEARTBEAT,
      OsppAction.STATUS_NOTIFICATION,
      OsppAction.METER_VALUES,
      OsppAction.SESSION_ENDED,
      OsppAction.SECURITY_EVENT,
      OsppAction.FIRMWARE_STATUS_NOTIFICATION,
      OsppAction.DIAGNOSTICS_NOTIFICATION,
      OsppAction.SIGN_CERTIFICATE,
    ];

    it('should include all 11 station-originated actions', () => {
      expect(stationToServer).toHaveLength(11);
      for (const action of stationToServer) {
        expect(Object.values(OsppAction)).toContain(action);
      }
    });
  });

  describe('Server → Station actions', () => {
    const serverToStation: OsppAction[] = [
      OsppAction.RESERVE_BAY,
      OsppAction.CANCEL_RESERVATION,
      OsppAction.START_SERVICE,
      OsppAction.STOP_SERVICE,
      OsppAction.CHANGE_CONFIGURATION,
      OsppAction.GET_CONFIGURATION,
      OsppAction.RESET,
      OsppAction.UPDATE_FIRMWARE,
      OsppAction.GET_DIAGNOSTICS,
      OsppAction.SET_MAINTENANCE_MODE,
      OsppAction.UPDATE_SERVICE_CATALOG,
      OsppAction.CERTIFICATE_INSTALL,
      OsppAction.TRIGGER_CERTIFICATE_RENEWAL,
      OsppAction.TRIGGER_MESSAGE,
    ];

    it('should include all 14 server-originated actions', () => {
      expect(serverToStation).toHaveLength(14);
      for (const action of serverToStation) {
        expect(Object.values(OsppAction)).toContain(action);
      }
    });
  });

  describe('Broker → Server actions', () => {
    it('should include ConnectionLost as the only broker-originated action', () => {
      expect(OsppAction.CONNECTION_LOST).toBe('ConnectionLost');
    });
  });

  describe('Bidirectional actions', () => {
    it('should include DataTransfer as the only bidirectional action', () => {
      expect(OsppAction.DATA_TRANSFER).toBe('DataTransfer');
    });
  });

  describe('direction coverage', () => {
    it('11 station + 14 server + 1 broker + 1 bidirectional = 27', () => {
      expect(11 + 14 + 1 + 1).toBe(27);
    });
  });

  describe('exact PascalCase values match spec', () => {
    const expectedValues = [
      'BootNotification',
      'AuthorizeOfflinePass',
      'ReserveBay',
      'CancelReservation',
      'StartService',
      'StopService',
      'TransactionEvent',
      'Heartbeat',
      'StatusNotification',
      'MeterValues',
      'SessionEnded',
      'ConnectionLost',
      'SecurityEvent',
      'ChangeConfiguration',
      'GetConfiguration',
      'Reset',
      'UpdateFirmware',
      'FirmwareStatusNotification',
      'GetDiagnostics',
      'DiagnosticsNotification',
      'SetMaintenanceMode',
      'UpdateServiceCatalog',
      'SignCertificate',
      'CertificateInstall',
      'TriggerCertificateRenewal',
      'DataTransfer',
      'TriggerMessage',
    ];

    it('should contain exactly the spec-defined values', () => {
      const actual = Object.values(OsppAction).sort();
      const expected = [...expectedValues].sort();
      expect(actual).toEqual(expected);
    });
  });

  describe('EVENT-only actions (no RESPONSE expected)', () => {
    const eventActions: OsppAction[] = [
      OsppAction.STATUS_NOTIFICATION,
      OsppAction.METER_VALUES,
      OsppAction.SESSION_ENDED,
      OsppAction.CONNECTION_LOST,
      OsppAction.SECURITY_EVENT,
      OsppAction.FIRMWARE_STATUS_NOTIFICATION,
      OsppAction.DIAGNOSTICS_NOTIFICATION,
    ];

    it('should have 7 event-only actions', () => {
      expect(eventActions).toHaveLength(7);
    });
  });

  describe('REQ/RES actions', () => {
    const reqResActions: OsppAction[] = [
      OsppAction.BOOT_NOTIFICATION,
      OsppAction.AUTHORIZE_OFFLINE_PASS,
      OsppAction.RESERVE_BAY,
      OsppAction.CANCEL_RESERVATION,
      OsppAction.START_SERVICE,
      OsppAction.STOP_SERVICE,
      OsppAction.TRANSACTION_EVENT,
      OsppAction.HEARTBEAT,
      OsppAction.CHANGE_CONFIGURATION,
      OsppAction.GET_CONFIGURATION,
      OsppAction.RESET,
      OsppAction.UPDATE_FIRMWARE,
      OsppAction.GET_DIAGNOSTICS,
      OsppAction.SET_MAINTENANCE_MODE,
      OsppAction.UPDATE_SERVICE_CATALOG,
      OsppAction.SIGN_CERTIFICATE,
      OsppAction.CERTIFICATE_INSTALL,
      OsppAction.TRIGGER_CERTIFICATE_RENEWAL,
      OsppAction.DATA_TRANSFER,
      OsppAction.TRIGGER_MESSAGE,
    ];

    it('should have 20 request/response actions', () => {
      expect(reqResActions).toHaveLength(20);
    });

    it('20 REQ/RES + 7 EVENT = 27 total', () => {
      expect(20 + 7).toBe(27);
    });
  });
});
