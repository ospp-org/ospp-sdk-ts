/**
 * The canonical firmware update transition table — spec/05-state-machines.md §6.3.
 *
 * The table has fourteen ROWS and thirteen EDGES. §6.3: "`Verifying -> Failed`
 * appears twice — once for a checksum mismatch and once for an invalid signature
 * — because the two have different actions and different error codes, not
 * because they are two transitions. An implementation of this machine has **13**
 * `(from, to)` pairs, and a conformance check that asserts a transition *count*
 * must assert 13; one that counts the rows of this table gets 14 and then has to
 * invent an edge to reach it."
 *
 * That is the defect this file exists to prevent, and it is why nothing here
 * asserts a cardinal. A count is the one assertion that cannot say WHICH edge
 * moved: `14` and `13` are the same diff whether the machine gained a phantom or
 * lost a real one. The list below fixes the SET, so removing an edge shows up in
 * review as a named line, and the exhaustive sweep closes the other direction.
 *
 * The pair list is transcribed from §6.3 and is the SAME vector list the
 * ospp-sdk-php mirror of this file asserts. Both SDKs are reference
 * implementations and a disagreement between them becomes a defect in every
 * consumer — it has once already, which is why this table now has one home.
 *
 * This machine's edges were correct in this SDK and wrong in ospp-sdk-php, which
 * carried `Downloaded -> Failed` and `Installed -> Failed` (neither is in §6.3)
 * and lacked `Failed -> Idle` (which §6.3 lists and its closing paragraph
 * restates as an obligation). Each SDK's own tests pinned its own answer, so
 * nothing compared them. That is what this file is for.
 */

import { describe, it, expect } from 'vitest';
import {
  canTransition,
  FIRMWARE_TRANSITIONS,
  FIRMWARE_NOTIFICATION_STATUSES,
  applyFirmwareNotification,
  observableFirmwareTargets,
  firmwareStateFromNotificationStatus,
  firmwareStateToNotificationStatus,
  firmwareStateObservedBy,
  isObservableFirmwareState,
  isReportableFirmwareState,
  type FirmwareState,
} from '../../src/state-machines/FirmwareStateMachine.js';
import { OsppAction } from '../../src/actions/OsppAction.js';
import notificationSchema from '../../src/schemas/mqtt/firmware-status-notification.schema.json' with { type: 'json' };

const ALL_STATES: readonly FirmwareState[] = [
  'Idle',
  'Downloading',
  'Downloaded',
  'Verifying',
  'Verified',
  'Installing',
  'Installed',
  'Rebooting',
  'Activated',
  'Failed',
];

/** The thirteen distinct `(from, to)` pairs of §6.3, in table order. */
const EDGES: ReadonlyArray<readonly [FirmwareState, FirmwareState]> = [
  // UpdateFirmware [MSG-016] accepted
  ['Idle', 'Downloading'],

  // Download complete / Download error
  ['Downloading', 'Downloaded'],
  ['Downloading', 'Failed'],

  // Integrity and authenticity checks start. `Downloaded` has ONE exit: §6.3
  // lists no `Downloaded -> Failed` row. A staging area that is not intact
  // fails in `Verifying`, which is where the checks run.
  ['Downloaded', 'Verifying'],

  // Checksum matches AND signature verifies.
  ['Verifying', 'Verified'],
  // The doubled row: "Checksum mismatch" and "Signature invalid (5112)" are two
  // rows and ONE edge.
  ['Verifying', 'Failed'],

  // Write to inactive partition begins.
  ['Verified', 'Installing'],

  // Write complete / Write error
  ['Installing', 'Installed'],
  ['Installing', 'Failed'],

  // Station reboots. `Installed` has ONE exit: §6.3 lists no `Installed ->
  // Failed` row. The write already succeeded and the boot target is already
  // set; the next thing that can go wrong is the boot, and that is
  // `Rebooting -> Failed` under the watchdog.
  ['Installed', 'Rebooting'],

  // Boot on new partition / Boot failure, watchdog
  ['Rebooting', 'Activated'],
  ['Rebooting', 'Failed'],

  // Rollback complete. §6.3: "`Failed` has exactly one outgoing edge,
  // `Failed -> Idle`; it is **not** terminal, and a machine that treats it as
  // terminal can run one firmware update and never a second."
  ['Failed', 'Idle'],
];

const key = (f: FirmwareState, t: FirmwareState) => `${f}>${t}`;

describe('canonical firmware transition table (§6.3)', () => {
  it.each(EDGES)('§6.3 lists %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  /**
   * Everything outside the list is invalid.
   *
   * §1 (chapter preamble): "A transition not listed for a machine is invalid,
   * and implementations MUST NOT perform one."
   *
   * This is the half a positive-only vector list cannot do. A machine that
   * answered `true` to everything would satisfy the cases above and fail here
   * on the first non-edge.
   */
  it('refuses every pair outside the table', () => {
    const table = new Set(EDGES.map(([f, t]) => key(f, t)));

    for (const from of ALL_STATES) {
      for (const to of ALL_STATES) {
        expect(canTransition(from, to), key(from, to)).toBe(table.has(key(from, to)));
      }
    }
  });

  /** The exported map must describe the same machine as `canTransition()`. */
  it('exports a transition map that agrees with canTransition', () => {
    const fromMap: string[] = [];
    for (const [from, targets] of FIRMWARE_TRANSITIONS) {
      for (const to of targets) fromMap.push(key(from, to));
    }

    expect(fromMap.sort()).toEqual(EDGES.map(([f, t]) => key(f, t)).sort());
  });

  /**
   * `Activated` is terminal and `Failed` is not — stated as behaviour rather
   * than as a property, because a single-use machine is the consequence the
   * missing edge had in the other SDK.
   */
  it('survives a failed update and can run another', () => {
    expect([...(FIRMWARE_TRANSITIONS.get('Failed') ?? [])]).toEqual(['Idle']);
    expect(FIRMWARE_TRANSITIONS.get('Activated')).toBeUndefined();

    const walk: ReadonlyArray<readonly [FirmwareState, FirmwareState]> = [
      ['Idle', 'Downloading'],
      ['Downloading', 'Failed'],
      ['Failed', 'Idle'],
      ['Idle', 'Downloading'],
    ];

    for (const [from, to] of walk) {
      expect(canTransition(from, to), key(from, to)).toBe(true);
    }
  });

  it('has no self-transition', () => {
    for (const state of ALL_STATES) {
      expect(canTransition(state, state), key(state, state)).toBe(false);
    }
  });

  /** The state list above must not drift from the exported union. */
  it('covers every state the machine defines', () => {
    const reachable = new Set<FirmwareState>(['Idle']);
    for (const [from, to] of EDGES) {
      reachable.add(from);
      reachable.add(to);
    }
    expect([...reachable].sort()).toEqual([...ALL_STATES].sort());
  });
});

/**
 * The wire <-> machine bridge — spec/05-state-machines.md §6.6.
 *
 * §6.6 exists because this machine's gap to the wire is the widest in the chapter:
 * a FirmwareStatusNotification carries FIVE of the ten states, and the other five
 * are not one kind of thing. Four are unobservable — "a server that models the
 * station's ten states will hold four of them that nothing on the wire can ever
 * set" — and the fifth, `Activated`, is reported by BootNotification [MSG-001]
 * instead. The diagnostics bridge (§8.4) had one non-reportable state and no such
 * split, so a single predicate answered both questions there and cannot here.
 *
 * The consequence that costs a consumer money is the SKIP. Three of the thirteen
 * edges run through unobservable states, so the conforming notification sequence is
 * not a walk of §6.3: the station goes `Downloaded -> Verifying -> Verified ->
 * Installing` and the server is told `Downloaded` then `Installing`. Feed those two
 * into `canTransition` and the update is refused at the moment it starts installing.
 *
 * Nothing below asserts a cardinal — the same rule §6.3's closing paragraph states
 * for the 14 rows / 13 edges applies to these pairs, and for the same reason: a
 * count cannot say WHICH pair moved.
 */

/** The five states with a FirmwareStatusNotification value (§6.6). */
const REPORTABLE: readonly FirmwareState[] = [
  'Downloading',
  'Downloaded',
  'Installing',
  'Installed',
  'Failed',
];

/** §6.6: "Four states have no notification value at all and are ... unobservable." */
const UNOBSERVABLE: readonly FirmwareState[] = ['Idle', 'Verifying', 'Verified', 'Rebooting'];

/**
 * Every `(held state, arriving status)` pair a server can legitimately see.
 *
 * Transcribed from §6.3's edges read through §6.6's mapping — the reportable states
 * reachable by a path whose intermediate states are all unobservable. It is a SET,
 * not a count: that it happens to have as many members as the machine has edges is
 * a coincidence of this table and nothing may lean on it.
 */
const OBSERVABLE_PAIRS: ReadonlyArray<readonly [FirmwareState, FirmwareState]> = [
  // The entry. A server holding `Idle` is told `Downloading` (§6.3 row 1).
  ['Idle', 'Downloading'],

  ['Downloading', 'Downloaded'],
  ['Downloading', 'Failed'],

  // The SKIP: `Downloaded -> Verifying -> Verified -> Installing`, two silent
  // states, one observed step. And `Downloaded -> Verifying -> Failed` for a
  // checksum mismatch or an invalid signature (5112) — one silent state.
  ['Downloaded', 'Installing'],
  ['Downloaded', 'Failed'],

  // A consumer that did model the silent states still advances correctly.
  ['Verifying', 'Installing'],
  ['Verifying', 'Failed'],
  ['Verified', 'Installing'],

  ['Installing', 'Installed'],
  ['Installing', 'Failed'],

  // `Installed -> Rebooting -> Failed` under the watchdog. The SUCCESS branch of
  // `Rebooting` is `Activated`, which this message never carries, so `Installed`
  // has exactly one observable successor on this wire and silence is the other
  // outcome.
  ['Installed', 'Failed'],
  ['Rebooting', 'Failed'],

  // `Failed -> Idle -> Downloading`. §8.4 names this class of edge for diagnostics
  // — "no wire trigger, and a server must not wait for one" — and it is the same
  // here: nothing announces the rollback is done, the next `Downloading` does.
  ['Failed', 'Downloading'],
];

describe('firmware wire <-> machine bridge (§6.6)', () => {
  it('admits exactly the vendored schema enum, and nothing else', () => {
    // Read from the schema rather than a literal, so a spec change to the
    // notification enum fails here instead of being absorbed by this file.
    expect(notificationSchema.properties.status.enum).toEqual([...FIRMWARE_NOTIFICATION_STATUSES]);

    for (const status of FIRMWARE_NOTIFICATION_STATUSES) {
      expect(firmwareStateFromNotificationStatus(status)).toBe(status);
      expect(firmwareStateToNotificationStatus(status)).toBe(status);
    }

    // The four unobservable states are not wire values, and neither is `Activated`.
    for (const state of [...UNOBSERVABLE, 'Activated' as FirmwareState]) {
      expect(() => firmwareStateFromNotificationStatus(state), state).toThrow(RangeError);
      expect(firmwareStateToNotificationStatus(state), state).toBeNull();
    }
  });

  /**
   * The distinction the diagnostics bridge never had to draw.
   *
   * `!isReportable` has FIVE members and `!isObservable` has FOUR. A server that
   * used one for the other either waits forever for a `Verifying` that has no
   * message, or discards the BootNotification that is the only report a completed
   * update ever gets.
   */
  it('separates "no notification value" from "never observed"', () => {
    const notReportable = ALL_STATES.filter((s) => !isReportableFirmwareState(s));
    const notObservable = ALL_STATES.filter((s) => !isObservableFirmwareState(s));

    expect(ALL_STATES.filter(isReportableFirmwareState).sort()).toEqual([...REPORTABLE].sort());
    expect(notObservable.sort()).toEqual([...UNOBSERVABLE].sort());

    // The two sets differ, and they differ by exactly `Activated`.
    expect(notReportable.filter((s) => !notObservable.includes(s))).toEqual(['Activated']);

    for (const state of REPORTABLE) {
      expect(firmwareStateObservedBy(state), state).toBe(OsppAction.FIRMWARE_STATUS_NOTIFICATION);
    }
    expect(firmwareStateObservedBy('Activated')).toBe(OsppAction.BOOT_NOTIFICATION);
    for (const state of UNOBSERVABLE) {
      expect(firmwareStateObservedBy(state), state).toBeNull();
    }
  });

  /**
   * The pair SET, swept exhaustively — 10 held states x 5 arriving statuses.
   *
   * Every one of the 50 combinations is asserted one way or the other, so a pair
   * that is neither permitted nor refused cannot exist. A repeat of the held state
   * is a progress report and is accepted without being a transition, which is why
   * it is excluded from the pair list rather than added to it.
   */
  it('permits exactly the observable pairs and refuses every other', () => {
    const permitted = new Set(OBSERVABLE_PAIRS.map(([f, t]) => key(f, t)));
    let accepted = 0;
    let refused = 0;

    for (const from of ALL_STATES) {
      for (const status of FIRMWARE_NOTIFICATION_STATUSES) {
        const isRepeat = status === from;
        const shouldPass = isRepeat || permitted.has(key(from, status));

        if (shouldPass) {
          expect(applyFirmwareNotification(from, status), key(from, status)).toBe(status);
          accepted++;
        } else {
          expect(() => applyFirmwareNotification(from, status), key(from, status)).toThrow(
            `Invalid firmware transition: ${from} → ${status}`,
          );
          refused++;
        }
      }
    }

    // The denominator. Without it a sweep that iterated nothing would pass.
    expect(accepted + refused).toBe(ALL_STATES.length * FIRMWARE_NOTIFICATION_STATUSES.length);
    expect(accepted).toBeGreaterThan(0);
    expect(refused).toBeGreaterThan(0);
  });

  it('exposes the same pairs through observableFirmwareTargets', () => {
    const fromFn: string[] = [];
    for (const from of ALL_STATES) {
      for (const to of observableFirmwareTargets(from)) fromFn.push(key(from, to));
    }
    expect(fromFn.sort()).toEqual(OBSERVABLE_PAIRS.map(([f, t]) => key(f, t)).sort());

    // `Activated` is terminal, so nothing follows it on any wire.
    expect(observableFirmwareTargets('Activated')).toEqual([]);
  });

  /**
   * The defect the bridge exists to prevent, driven end to end.
   *
   * This is the conforming success stream of `firmware-status.md` §5.1. A consumer
   * feeding it into `canTransition` fails at the third step, because §6.3 has no
   * `Downloaded -> Installing` row — and MUST NOT gain one.
   */
  it('accepts the conforming stream across the silent verification interval', () => {
    const stream = ['Downloading', 'Downloaded', 'Installing', 'Installed'];

    let state: FirmwareState = 'Idle';
    for (const status of stream) state = applyFirmwareNotification(state, status);
    expect(state).toBe('Installed');

    // And the raw table still refuses the step the wire skips, which is the correct
    // answer to a different question.
    expect(canTransition('Downloaded', 'Installing')).toBe(false);
    expect(canTransition('Downloaded', 'Verifying')).toBe(true);
    expect(canTransition('Verified', 'Installing')).toBe(true);
  });

  /**
   * The repeat streams. `firmware-status.md` §5 rule 1 asks for a notification at
   * every 10% of `Downloading` and rule 2 for four milestones of `Installing`, and
   * §6.3 has a self-edge for neither.
   */
  it('accepts the repeated progress streams as one state each', () => {
    const stream = [
      'Downloading', 'Downloading', 'Downloading', 'Downloading',
      'Downloaded',
      'Installing', 'Installing', 'Installing', 'Installing',
      'Installed',
    ];

    let state: FirmwareState = 'Idle';
    for (const status of stream) state = applyFirmwareNotification(state, status);
    expect(state).toBe('Installed');

    expect(canTransition('Downloading', 'Downloading')).toBe(false);
    expect(canTransition('Installing', 'Installing')).toBe(false);
  });

  /**
   * The end of a successful update is SILENCE on this message, and the news arrives
   * on another one.
   *
   * §6.6: `Installed -> Rebooting -> Activated` crosses one unobservable state and
   * ends in a state this notification does not carry. The only FirmwareStatusNotification
   * that can follow `Installed` is the watchdog's `Failed`.
   */
  it('has no notification for a successful activation', () => {
    expect(observableFirmwareTargets('Installed')).toEqual(['Failed']);
    expect(firmwareStateToNotificationStatus('Activated')).toBeNull();
    expect(firmwareStateObservedBy('Activated')).toBe(OsppAction.BOOT_NOTIFICATION);

    // A server holding `Installed` that waits for a firmware status to tell it the
    // update completed waits forever. §6.3 still has the edges; they are silent.
    expect(canTransition('Installed', 'Rebooting')).toBe(true);
    expect(canTransition('Rebooting', 'Activated')).toBe(true);
  });

  /** A second update after a rollback, through the bridge alone. */
  it('needs no message to return to Idle between two updates', () => {
    let state: FirmwareState = 'Idle';
    for (const status of ['Downloading', 'Failed']) {
      state = applyFirmwareNotification(state, status);
    }
    expect(state).toBe('Failed');

    // `Failed -> Idle` is the rollback and nothing announces it. The next thing the
    // server hears is the next `Downloading`.
    state = applyFirmwareNotification(state, 'Downloading');
    expect(state).toBe('Downloading');
  });

  it('refuses a stream the table cannot produce', () => {
    // Skipping `Downloaded`: the station MUST report each status transition
    // (`firmware-status.md` §6 rule 1), so a jump straight to `Installing` is a
    // report from a station that skipped a MUST.
    expect(() => applyFirmwareNotification('Downloading', 'Installing')).toThrow();

    // Nothing follows `Activated`.
    expect(() => applyFirmwareNotification('Activated', 'Downloading')).toThrow();

    // `Installed` cannot go back to `Installing`.
    expect(() => applyFirmwareNotification('Installed', 'Installing')).toThrow();

    // And a value outside the enum is a RangeError, not a transition error.
    expect(() => applyFirmwareNotification('Idle', 'Verifying')).toThrow(RangeError);
  });
});
