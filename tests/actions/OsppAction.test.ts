import { describe, it, expect } from 'vitest';
import { OsppAction } from '../../src/actions/OsppAction';

/**
 * The six buckets below are TRANSCRIBED from the `Direction` and `Type` columns
 * of the MQTT Quick Reference in `spec/03-messages.md`. `OsppAction` carries no
 * direction or type metadata, so there is nothing in this SDK to derive them
 * from; the gate that compares this enum to something OUTSIDE this repository is
 * `npm run check:action-registry`, which reads the Action cell of that same
 * table at the pinned `.spec-ref`. It does not read the Direction or Type cells,
 * so those two columns are transcribed here and nowhere checked upstream.
 *
 * What the two partition assertions below establish is the property that does
 * NOT depend on the transcription being right: whatever the buckets say, they
 * say it about EVERY member of the enum, and about no member twice. An action
 * added to `OsppAction` and forgotten here goes red; one deleted from the enum
 * and left here goes red.
 *
 * `ConnectionLost` is `Broker -> Server, or Station -> Server` in the spec. It
 * is bucketed under broker alone so the four direction buckets stay disjoint;
 * the station bucket is therefore station-ONLY, which is what makes 11 + 14 + 1
 * + 1 a partition rather than a cover.
 */
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

const brokerToServer: OsppAction[] = [OsppAction.CONNECTION_LOST];

const bidirectional: OsppAction[] = [OsppAction.DATA_TRANSFER];

const eventActions: OsppAction[] = [
  OsppAction.STATUS_NOTIFICATION,
  OsppAction.METER_VALUES,
  OsppAction.SESSION_ENDED,
  OsppAction.CONNECTION_LOST,
  OsppAction.SECURITY_EVENT,
  OsppAction.FIRMWARE_STATUS_NOTIFICATION,
  OsppAction.DIAGNOSTICS_NOTIFICATION,
];

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

/**
 * Report how `buckets` sit against the LIVE enum. Every field is derived from
 * `Object.values(OsppAction)` on one side and from the buckets on the other, so
 * there is no arm of this that a change to `src/actions/OsppAction.ts` cannot
 * move. A partition is the empty report plus equal totals.
 */
function partitionReport(buckets: readonly (readonly OsppAction[])[]) {
  const all = Object.values(OsppAction) as OsppAction[];
  const placed = buckets.flat();

  return {
    /** In the enum, in no bucket — an action added upstream and not classified. */
    unplaced: all.filter((a) => !placed.includes(a)),
    /** In more than one bucket, or twice in one — the buckets are not disjoint. */
    duplicated: placed.filter((a, i) => placed.indexOf(a) !== i),
    /** In a bucket, not in the enum — a member renamed or deleted upstream. */
    unknown: placed.filter((a) => !all.includes(a)),
    placedCount: placed.length,
    enumCount: all.length,
  };
}

const EXACT_PARTITION = { unplaced: [], duplicated: [], unknown: [] };

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
    // The length here is the transcription pinned against itself and cannot be
    // moved by src/; what reads the enum is the loop below, and what makes the
    // bucket answerable to the enum as a whole is the partition test further
    // down. Pinned so that re-bucketing an action has to be deliberate twice.
    it('should include all 11 station-originated actions', () => {
      expect(stationToServer).toHaveLength(11);
      for (const action of stationToServer) {
        expect(Object.values(OsppAction)).toContain(action);
      }
    });
  });

  describe('Server → Station actions', () => {
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
      expect(brokerToServer).toEqual([OsppAction.CONNECTION_LOST]);
    });
  });

  describe('Bidirectional actions', () => {
    it('should include DataTransfer as the only bidirectional action', () => {
      expect(OsppAction.DATA_TRANSFER).toBe('DataTransfer');
      expect(bidirectional).toEqual([OsppAction.DATA_TRANSFER]);
    });
  });

  describe('direction coverage', () => {
    // WAS `expect(11 + 14 + 1 + 1).toBe(27)` — an arithmetic identity that never
    // touched the enum and so could not fail. Both sides constant-folded to 27,
    // so it would have passed over an empty enum, a renamed member, or a deleted
    // one, and it restated a sum the four blocks above had already stated. It was
    // green in every tag this repository carries. Same defect and same repair as
    // `OsppErrorCode.test.ts` at 0.39.0 and `ConfigKey.test.ts` at 0.29.0: the
    // question is not whether four numbers add up, it is whether the four buckets
    // PARTITION the enum — every action in exactly one, nothing left over on
    // either side.
    it('the four direction buckets partition the action enum exactly', () => {
      const report = partitionReport([
        stationToServer,
        serverToStation,
        brokerToServer,
        bidirectional,
      ]);

      expect({
        unplaced: report.unplaced,
        duplicated: report.duplicated,
        unknown: report.unknown,
      }).toEqual(EXACT_PARTITION);
      expect(report.placedCount).toBe(report.enumCount);
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
    it('should have 7 event-only actions', () => {
      expect(eventActions).toHaveLength(7);
      for (const action of eventActions) {
        expect(Object.values(OsppAction)).toContain(action);
      }
    });
  });

  describe('REQ/RES actions', () => {
    it('should have 20 request/response actions', () => {
      expect(reqResActions).toHaveLength(20);
      for (const action of reqResActions) {
        expect(Object.values(OsppAction)).toContain(action);
      }
    });

    // WAS `expect(20 + 7).toBe(27)` — the second instance of the same defect, in
    // the same file, over the Type column instead of the Direction column. It
    // constant-folded to `27 === 27` and read nothing. Replaced with the same
    // structural claim: REQ/RES and EVENT are a two-way split of the enum, so an
    // action that is neither, or both, or absent from the enum entirely, is now
    // named in the failure rather than absorbed by an identity.
    it('REQ/RES and EVENT partition the action enum exactly', () => {
      const report = partitionReport([reqResActions, eventActions]);

      expect({
        unplaced: report.unplaced,
        duplicated: report.duplicated,
        unknown: report.unknown,
      }).toEqual(EXACT_PARTITION);
      expect(report.placedCount).toBe(report.enumCount);
    });
  });
});
