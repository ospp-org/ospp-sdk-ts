import { describe, it, expect } from 'vitest';
import {
  OsppAction,
  STATION_TO_SERVER_ACTIONS,
  SERVER_TO_STATION_ACTIONS,
  BROKER_TO_SERVER_ACTIONS,
  BIDIRECTIONAL_ACTIONS,
  EVENT_ACTIONS,
  REQ_RES_ACTIONS,
} from '../../src/actions/OsppAction';

/**
 * The six buckets this file exercises are no longer written here. They were
 * local `const` arrays TRANSCRIBED from the `Direction` and `Type` columns of
 * the MQTT Quick Reference in `spec/03-messages.md`, and the note that used to
 * stand in this place said what that cost: the gate that compares this enum to
 * something outside the repository read the Action cell only, so the two
 * columns were transcribed here and checked nowhere upstream.
 *
 * They now live in `src/actions/OsppAction.ts` and are imported above, which is
 * what allows `npm run check:action-registry` to compare them to those two
 * columns at the pinned `.spec-ref`, in both directions, one spec literal to
 * one list. This file keeps the half of the question the spec cannot answer:
 * whatever the lists say, they say it about EVERY member of the enum and about
 * no member twice. An action added to `OsppAction` and left unclassified goes
 * red here; one deleted from the enum and left in a list goes red here; one
 * routed to the wrong column goes red in the gate.
 *
 * `ConnectionLost` is `Broker -> Server, or Station -> Server` in the spec and
 * is bucketed under broker alone so the four direction lists stay disjoint; the
 * station list is therefore station-ONLY, which is what makes 11 + 14 + 1 + 1 a
 * partition rather than a cover.
 */

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
    // The length used to be a transcription pinned against itself, unmovable by
    // src/ because the list it counted was written two screens above it. The
    // list now comes from src/, so this is a real pin: re-bucketing an action
    // moves it and the assertion says so. It is kept deliberately redundant
    // with the gate — the gate answers "does the spec agree", this answers
    // "did anyone change the split without meaning to", and the two fail at
    // different times.
    it('should include all 11 station-originated actions', () => {
      expect(STATION_TO_SERVER_ACTIONS).toHaveLength(11);
      for (const action of STATION_TO_SERVER_ACTIONS) {
        expect(Object.values(OsppAction)).toContain(action);
      }
    });
  });

  describe('Server → Station actions', () => {
    it('should include all 14 server-originated actions', () => {
      expect(SERVER_TO_STATION_ACTIONS).toHaveLength(14);
      for (const action of SERVER_TO_STATION_ACTIONS) {
        expect(Object.values(OsppAction)).toContain(action);
      }
    });
  });

  describe('Broker → Server actions', () => {
    it('should include ConnectionLost as the only broker-originated action', () => {
      expect(OsppAction.CONNECTION_LOST).toBe('ConnectionLost');
      expect(BROKER_TO_SERVER_ACTIONS).toEqual([OsppAction.CONNECTION_LOST]);
    });
  });

  describe('Bidirectional actions', () => {
    it('should include DataTransfer as the only bidirectional action', () => {
      expect(OsppAction.DATA_TRANSFER).toBe('DataTransfer');
      expect(BIDIRECTIONAL_ACTIONS).toEqual([OsppAction.DATA_TRANSFER]);
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
        STATION_TO_SERVER_ACTIONS,
        SERVER_TO_STATION_ACTIONS,
        BROKER_TO_SERVER_ACTIONS,
        BIDIRECTIONAL_ACTIONS,
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
      expect(EVENT_ACTIONS).toHaveLength(7);
      for (const action of EVENT_ACTIONS) {
        expect(Object.values(OsppAction)).toContain(action);
      }
    });
  });

  describe('REQ/RES actions', () => {
    it('should have 20 request/response actions', () => {
      expect(REQ_RES_ACTIONS).toHaveLength(20);
      for (const action of REQ_RES_ACTIONS) {
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
      const report = partitionReport([REQ_RES_ACTIONS, EVENT_ACTIONS]);

      expect({
        unplaced: report.unplaced,
        duplicated: report.duplicated,
        unknown: report.unknown,
      }).toEqual(EXACT_PARTITION);
      expect(report.placedCount).toBe(report.enumCount);
    });
  });
});
