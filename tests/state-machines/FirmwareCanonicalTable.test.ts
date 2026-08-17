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
  type FirmwareState,
} from '../../src/state-machines/FirmwareStateMachine.js';

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
