/**
 * The station state machine — spec/05-state-machines.md §1.
 *
 * Mirrored by ospp-sdk-php
 * tests/Contract/StateMachines/StationTransitionsContractTest.php.
 *
 * NEITHER SDK had this machine before this arc. The chapter defined machines
 * for bays, sessions, reservations, BLE and firmware and none for the station,
 * so `Pending`, `Rejected`, `Accepted` and not-provisioned had no formal home —
 * and `3018 TOPOLOGY_MISMATCH` depended on a state that existed nowhere
 * structurally.
 */

import { describe, it, expect } from 'vitest';
import { StationState } from '../../src/enums/StationState';
import {
  StationStateMachine,
  canTransition,
  STATION_TRANSITIONS,
  isRestricted,
  mayReceiveCommands,
  mayAnswerCommands,
  maySendUnsolicited,
  mayStartNewService,
  holdsSessionKey,
} from '../../src/state-machines/StationStateMachine';

const { NOT_PROVISIONED, BOOTING, PENDING, REJECTED, OPERATIONAL, DISCONNECTED } = StationState;

describe('states', () => {
  /**
   * §1: "A station MUST be in exactly one of the six defined states at all
   * times." — NotProvisioned, Booting, Pending, Rejected, Operational,
   * Disconnected.
   */
  it('is exactly six', () => {
    expect(Object.values(StationState)).toEqual([
      'NotProvisioned',
      'Booting',
      'Pending',
      'Rejected',
      'Operational',
      'Disconnected',
    ]);
  });
});

describe('the transition table (§1.3)', () => {
  const valid: [StationState, StationState][] = [
    [NOT_PROVISIONED, BOOTING], // Credential obtained
    [BOOTING, OPERATIONAL], // RESPONSE Accepted
    [BOOTING, PENDING], // RESPONSE Pending
    [BOOTING, REJECTED], // RESPONSE Rejected
    [BOOTING, BOOTING], // Response timeout / retry
    [PENDING, BOOTING], // retryInterval elapsed
    [REJECTED, BOOTING], // retryInterval elapsed
    [BOOTING, DISCONNECTED], // MQTT connection lost
    [PENDING, DISCONNECTED],
    [REJECTED, DISCONNECTED],
    [OPERATIONAL, DISCONNECTED],
    [DISCONNECTED, BOOTING], // MQTT reconnected
    [OPERATIONAL, BOOTING], // Reboot
  ];

  it.each(valid)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it('has an entry for every state', () => {
    for (const s of Object.values(StationState)) {
      expect(STATION_TRANSITIONS.has(s), `missing ${s}`).toBe(true);
    }
  });

  /**
   * §1.3: "In particular there is **no** edge from `Pending` or `Rejected`
   * directly to `Operational`: a station leaves a restricted state only by
   * re-sending BootNotification and receiving `Accepted`. The server cannot
   * promote a station in place, and a station MUST NOT infer promotion from a
   * command arriving while it is `Pending`."
   */
  it('has no direct promotion out of a restricted state', () => {
    expect(canTransition(PENDING, OPERATIONAL)).toBe(false);
    expect(canTransition(REJECTED, OPERATIONAL)).toBe(false);
  });

  /**
   * §1.2: "A station MUST NOT enter this state autonomously — there is no
   * remote credential wipe."
   */
  it('never re-enters NotProvisioned', () => {
    for (const from of Object.values(StationState)) {
      expect(canTransition(from, NOT_PROVISIONED), `${from} -> NotProvisioned`).toBe(false);
    }
  });

  it('refuses everything the table does not list', () => {
    const allowed = new Set(valid.map(([f, t]) => `${f}>${t}`));

    for (const from of Object.values(StationState)) {
      for (const to of Object.values(StationState)) {
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(allowed.has(`${from}>${to}`));
      }
    }
  });
});

describe('the restricted states (§1.4)', () => {
  /**
   * §1.4: "`Pending` and `Rejected` are both restricted, and they differ in
   * exactly one respect: whether the station answers commands."
   */
  it('is Pending and Rejected', () => {
    expect(isRestricted(PENDING)).toBe(true);
    expect(isRestricted(REJECTED)).toBe(true);
    expect(isRestricted(OPERATIONAL)).toBe(false);
    expect(isRestricted(BOOTING)).toBe(false);
  });

  /**
   * The §1.4 table, row by row. Booting | Pending | Rejected | Operational.
   */
  it('matches §1.4 row: receives and processes server commands', () => {
    expect(mayReceiveCommands(BOOTING)).toBe(false);
    expect(mayReceiveCommands(PENDING)).toBe(true);
    expect(mayReceiveCommands(REJECTED)).toBe(false);
    expect(mayReceiveCommands(OPERATIONAL)).toBe(true);
  });

  it('matches §1.4 row: answers a server command with a RESPONSE', () => {
    expect(mayAnswerCommands(BOOTING)).toBe(false);
    expect(mayAnswerCommands(PENDING)).toBe(true);
    expect(mayAnswerCommands(REJECTED)).toBe(false);
    expect(mayAnswerCommands(OPERATIONAL)).toBe(true);
  });

  it('matches §1.4 row: sends anything else unsolicited', () => {
    expect(maySendUnsolicited(BOOTING)).toBe(false);
    expect(maySendUnsolicited(PENDING)).toBe(false);
    expect(maySendUnsolicited(REJECTED)).toBe(false);
    expect(maySendUnsolicited(OPERATIONAL)).toBe(true);
  });

  it('matches §1.4 row: starts new customer service', () => {
    expect(mayStartNewService(BOOTING)).toBe(false);
    expect(mayStartNewService(PENDING)).toBe(false);
    expect(mayStartNewService(REJECTED)).toBe(false);
    expect(mayStartNewService(OPERATIONAL)).toBe(true);
  });

  /**
   * §1.4: "The key row is what makes the rest of the table possible, and it is
   * easy to get wrong. [...] If a `Pending` station held no key, the server
   * could not send a command, the station could not accept one, and it could
   * not answer — the repair channel would exist only on paper."
   */
  it('matches §1.4 row: holds a session key — Pending does, Rejected does not', () => {
    expect(holdsSessionKey(BOOTING)).toBe(false);
    expect(holdsSessionKey(PENDING)).toBe(true);
    expect(holdsSessionKey(REJECTED)).toBe(false);
    expect(holdsSessionKey(OPERATIONAL)).toBe(true);
  });

  /**
   * The key row and the answering row must agree: a state that answers a signed
   * command must hold the key to sign the answer with.
   */
  it('never answers a command in a state where it holds no key', () => {
    for (const state of Object.values(StationState)) {
      if (mayAnswerCommands(state)) {
        expect(holdsSessionKey(state), `${state} answers commands but holds no key`).toBe(true);
      }
    }
  });
});

describe('StationStateMachine class', () => {
  it('starts in NotProvisioned by default', () => {
    expect(new StationStateMachine().state).toBe(NOT_PROVISIONED);
  });

  it('walks the ordinary boot path', () => {
    const sm = new StationStateMachine();
    sm.transition(BOOTING);
    sm.transition(OPERATIONAL);
    expect(sm.state).toBe(OPERATIONAL);
  });

  it('walks the repair path: Pending, retry, Accepted', () => {
    const sm = new StationStateMachine(BOOTING);
    sm.transition(PENDING);
    expect(sm.isRestricted).toBe(true);
    sm.transition(BOOTING);
    sm.transition(OPERATIONAL);
    expect(sm.isRestricted).toBe(false);
  });

  it('throws on an invalid transition', () => {
    const sm = new StationStateMachine(PENDING);
    expect(() => sm.transition(OPERATIONAL)).toThrow(
      'Invalid station transition: Pending → Operational',
    );
  });
});
