/**
 * The canonical bay transition table — spec/05-state-machines.md §2.3.
 *
 * "This is the canonical table. Nothing else in this specification restates it."
 *
 * The table has two parties in it and the `Effected by` column says which:
 * "Twenty `Station` rows by distinct `(from, to)` pair, and six `Server` rows —
 * twenty-six in all. [...] A station implements the `Station` rows. A server
 * implements all of them."
 *
 * The pair lists below are transcribed from §2.3 and are the SAME vectors the
 * ospp-sdk-php mirror of this file asserts. Both SDKs are reference
 * implementations and a disagreement between them becomes a defect in every
 * consumer — it has once already, which is why this table now has one home.
 */

import { describe, it, expect } from 'vitest';
import { BayStatus } from '../../src/enums/BayStatus.js';
import { EffectedBy } from '../../src/enums/EffectedBy.js';
import { canTransition, transitionCount } from '../../src/state-machines/BayStateMachine.js';

const { UNKNOWN, AVAILABLE, RESERVED, OCCUPIED, FINISHING, FAULTED, UNAVAILABLE } = BayStatus;

/** The twenty `Station` rows of §2.3, by distinct (from, to) pair. */
const STATION_PAIRS: ReadonlyArray<readonly [BayStatus, BayStatus]> = [
  // Unknown has FIVE exits, not three. §2.3: "A station that reboots mid-session
  // MUST resume that session [...] `Occupied` and `Finishing` are the two states
  // a resumed session can leave a bay in, and they are the two added."
  [UNKNOWN, AVAILABLE],
  [UNKNOWN, FAULTED],
  [UNKNOWN, UNAVAILABLE],
  [UNKNOWN, OCCUPIED],
  [UNKNOWN, FINISHING],

  [AVAILABLE, RESERVED],
  [AVAILABLE, OCCUPIED],
  [AVAILABLE, FAULTED],
  [AVAILABLE, UNAVAILABLE],

  [RESERVED, OCCUPIED],
  [RESERVED, AVAILABLE],
  [RESERVED, FAULTED],

  [OCCUPIED, FINISHING],
  [OCCUPIED, FAULTED],

  [FINISHING, AVAILABLE],
  [FINISHING, FAULTED],

  [FAULTED, AVAILABLE],
  [FAULTED, UNAVAILABLE],

  [UNAVAILABLE, AVAILABLE],
  // §2.3, Hardware error detected: "`Unavailable` is a source like any other: a
  // bay taken out of service can still develop a fault".
  [UNAVAILABLE, FAULTED],
];

/** The six `Server` rows of §2.3 — every state to `Unknown`, on connection loss. */
const SERVER_PAIRS: ReadonlyArray<readonly [BayStatus, BayStatus]> = [
  [AVAILABLE, UNKNOWN],
  [RESERVED, UNKNOWN],
  [OCCUPIED, UNKNOWN],
  [FINISHING, UNKNOWN],
  [FAULTED, UNKNOWN],
  [UNAVAILABLE, UNKNOWN],
];

describe('canonical bay transition table (§2.3)', () => {
  it('has twenty Station rows', () => {
    expect(STATION_PAIRS).toHaveLength(20);
    expect(transitionCount(EffectedBy.STATION)).toBe(20);
  });

  it('has six Server rows', () => {
    expect(SERVER_PAIRS).toHaveLength(6);
    expect(transitionCount(EffectedBy.SERVER) - transitionCount(EffectedBy.STATION)).toBe(6);
  });

  it('is twenty-six in all for a server', () => {
    expect(transitionCount(EffectedBy.SERVER)).toBe(26);
  });

  it.each(STATION_PAIRS)('station may effect %s -> %s', (from, to) => {
    expect(canTransition(from, to, EffectedBy.STATION)).toBe(true);
  });

  // "A server implements all twenty-six" — the Station rows included.
  it.each(STATION_PAIRS)('server also implements %s -> %s', (from, to) => {
    expect(canTransition(from, to, EffectedBy.SERVER)).toBe(true);
  });

  // "a station needs no others and MUST NOT implement the `Server` six."
  it.each(SERVER_PAIRS)('station MUST NOT effect %s -> %s', (from, to) => {
    expect(canTransition(from, to, EffectedBy.STATION)).toBe(false);
  });

  it.each(SERVER_PAIRS)('server may effect %s -> %s', (from, to) => {
    expect(canTransition(from, to, EffectedBy.SERVER)).toBe(true);
  });

  /**
   * Everything outside the union of the two lists is invalid for BOTH parties.
   *
   * §1.5 (chapter preamble): "A transition not listed for a machine is invalid,
   * and implementations MUST NOT perform one."
   */
  it('refuses every pair outside the table, for both parties', () => {
    const key = (f: BayStatus, t: BayStatus) => `${f}>${t}`;
    const station = new Set(STATION_PAIRS.map(([f, t]) => key(f, t)));
    const server = new Set([...station, ...SERVER_PAIRS.map(([f, t]) => key(f, t))]);

    const all = Object.values(BayStatus);
    let checked = 0;

    for (const from of all) {
      for (const to of all) {
        checked++;
        expect(canTransition(from, to, EffectedBy.STATION), `station ${key(from, to)}`).toBe(
          station.has(key(from, to)),
        );
        expect(canTransition(from, to, EffectedBy.SERVER), `server ${key(from, to)}`).toBe(
          server.has(key(from, to)),
        );
      }
    }

    expect(checked).toBe(49);
  });

  /**
   * No self-transition on either side. §2.5 is explicit that an `X -> X` is not
   * in the table, and status-notification.md §5 rule 2 turns on it.
   */
  it('has no self-transition for either party', () => {
    for (const state of Object.values(BayStatus)) {
      expect(canTransition(state, state, EffectedBy.STATION)).toBe(false);
      expect(canTransition(state, state, EffectedBy.SERVER)).toBe(false);
    }
  });
});
