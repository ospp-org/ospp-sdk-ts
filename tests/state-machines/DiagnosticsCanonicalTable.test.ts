/**
 * The canonical diagnostics upload transition table — spec/05-state-machines.md §8.3.
 *
 * Seven rows and seven edges. §8.3 states why the coincidence must not be leaned on:
 * "no `(from, to)` pair appears twice here, so the row count and the edge count
 * coincide. That they coincide is a property of this table and not a general one: a
 * conformance check MUST assert the pairs, not the cardinal, because a count cannot
 * say which edge moved."
 *
 * The file this replaces asserted `expect(valid).toHaveLength(7)` — the length of its
 * own literal array, which cannot fail on any change to DIAGNOSTICS_TRANSITIONS. It
 * also left two of the 25 ordered pairs asserted neither way: `Uploaded -> Uploading`
 * and `Failed -> Uploaded`.
 *
 * The pair list is transcribed from §8.3 and is the SAME list the ospp-sdk-php mirror
 * of this file asserts. Until spec `0.23.0` there was no §8 at all, and the two SDKs
 * disagreed on three edges with both suites green — which is what this file is for.
 */

import { describe, it, expect } from 'vitest';
import {
  canTransition,
  DIAGNOSTICS_TRANSITIONS,
  DIAGNOSTICS_NOTIFICATION_STATUSES,
  applyDiagnosticsNotification,
  diagnosticsStateFromNotificationStatus,
  diagnosticsStateToNotificationStatus,
  isReportableDiagnosticsState,
  type DiagnosticsState,
} from '../../src/state-machines/DiagnosticsStateMachine.js';
import notificationSchema from '../../src/schemas/mqtt/diagnostics-notification.schema.json' with { type: 'json' };

const ALL_STATES: readonly DiagnosticsState[] = [
  'Idle',
  'Collecting',
  'Uploading',
  'Uploaded',
  'Failed',
];

/** The seven distinct `(from, to)` pairs of §8.3, in table order. */
const EDGES: ReadonlyArray<readonly [DiagnosticsState, DiagnosticsState]> = [
  // GetDiagnostics [MSG-018] answered `Accepted` — the ONLY entry edge. §8.3:
  // "there is no `Idle -> Failed` edge, and its absence is load-bearing."
  ['Idle', 'Collecting'],

  // Archive complete / collection error
  ['Collecting', 'Uploading'],
  ['Collecting', 'Failed'],

  // PUT completes / PUT fails after the station's own retries
  ['Uploading', 'Uploaded'],
  ['Uploading', 'Failed'],

  // Both outcomes return to Idle, and §8.4 notes neither edge has a wire trigger.
  ['Uploaded', 'Idle'],
  ['Failed', 'Idle'],
];

const key = (f: DiagnosticsState, t: DiagnosticsState): string => `${f} -> ${t}`;

describe('canonical diagnostics table (spec §8.3)', () => {
  it.each(EDGES)('permits %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  /**
   * The half a positive-only list cannot do. 5 states = 25 ordered pairs; a machine
   * answering `true` to everything satisfies the cases above and fails here.
   */
  it('refuses every pair outside the table', () => {
    const table = new Set(EDGES.map(([f, t]) => key(f, t)));

    for (const from of ALL_STATES) {
      for (const to of ALL_STATES) {
        expect(canTransition(from, to), key(from, to)).toBe(table.has(key(from, to)));
      }
    }
  });

  it('exports a transition map that agrees with canTransition', () => {
    const fromMap: string[] = [];
    for (const [from, targets] of DIAGNOSTICS_TRANSITIONS) {
      for (const to of targets) fromMap.push(key(from, to));
    }

    expect(fromMap.sort()).toEqual(EDGES.map(([f, t]) => key(f, t)).sort());
  });

  it('has no self-transition', () => {
    for (const state of ALL_STATES) {
      expect(canTransition(state, state), key(state, state)).toBe(false);
    }
  });

  it('covers every state the machine defines', () => {
    const reachable = new Set<DiagnosticsState>(['Idle']);
    for (const [from, to] of EDGES) {
      reachable.add(from);
      reachable.add(to);
    }
    expect([...reachable].sort()).toEqual([...ALL_STATES].sort());
  });

  /**
   * Nothing is terminal, stated as behaviour. This is the property the ospp-sdk-php
   * mirror lacked: with `Uploaded` and `Failed` as dead ends the machine runs one
   * diagnostics upload and never a second.
   */
  it('survives an upload and can run another', () => {
    expect([...(DIAGNOSTICS_TRANSITIONS.get('Uploaded') ?? [])]).toEqual(['Idle']);
    expect([...(DIAGNOSTICS_TRANSITIONS.get('Failed') ?? [])]).toEqual(['Idle']);

    const walk: ReadonlyArray<readonly [DiagnosticsState, DiagnosticsState]> = [
      ['Idle', 'Collecting'],
      ['Collecting', 'Uploading'],
      ['Uploading', 'Uploaded'],
      ['Uploaded', 'Idle'],
      ['Idle', 'Collecting'],
      ['Collecting', 'Failed'],
      ['Failed', 'Idle'],
      ['Idle', 'Collecting'],
    ];

    for (const [from, to] of walk) {
      expect(canTransition(from, to), key(from, to)).toBe(true);
    }
  });
});

describe('the wire ↔ machine bridge (spec §8.4)', () => {
  /**
   * The wire enum is the schema's, not a hand-kept list. Read out of the vendored
   * schema so a spec change to it fails here rather than being absorbed by a literal.
   */
  it('declares exactly the four values the schema admits', () => {
    expect([...DIAGNOSTICS_NOTIFICATION_STATUSES]).toEqual(
      notificationSchema.properties.status.enum,
    );
  });

  it('maps every wire value onto a state and back', () => {
    for (const status of DIAGNOSTICS_NOTIFICATION_STATUSES) {
      const state = diagnosticsStateFromNotificationStatus(status);
      expect(diagnosticsStateToNotificationStatus(state)).toBe(status);
      expect(isReportableDiagnosticsState(state)).toBe(true);
    }
  });

  /** §8.4: `Idle` is reported by nothing, in either direction. */
  it('cannot produce Idle from any wire value, and Idle produces none', () => {
    const produced = DIAGNOSTICS_NOTIFICATION_STATUSES.map(
      diagnosticsStateFromNotificationStatus,
    );
    expect(produced).not.toContain('Idle');
    expect(produced).toHaveLength(ALL_STATES.length - 1);

    expect(diagnosticsStateToNotificationStatus('Idle')).toBeNull();
    expect(isReportableDiagnosticsState('Idle')).toBe(false);
  });

  it('rejects a status outside the schema enum', () => {
    // `Pending` is the ospp-sdk-php RECORD state (§8.5). It is not on the wire.
    expect(() => diagnosticsStateFromNotificationStatus('Pending')).toThrow(RangeError);
    expect(() => diagnosticsStateFromNotificationStatus('InProgress')).toThrow(RangeError);
  });

  /**
   * The defect the bridge exists to prevent, driven end to end.
   *
   * A server feeding every arriving notification into `transition()` throws on the
   * SECOND `Uploading` — and §5 rule 3 of `diagnostics-status.md` asks for one every
   * 10%. §8.4: a repeat of the current status is a progress report, not a transition.
   */
  it('accepts the repeated Uploading stream as one state', () => {
    const stream = [
      'Collecting',
      'Uploading',
      'Uploading',
      'Uploading',
      'Uploading',
      'Uploaded',
    ];

    let state: DiagnosticsState = 'Idle';
    for (const status of stream) {
      state = applyDiagnosticsNotification(state, status);
    }
    expect(state).toBe('Uploaded');

    // And the raw table still refuses the self-edge, which is the correct answer to
    // a different question — §8.3 "has no `Uploading -> Uploading` edge and MUST NOT
    // gain one."
    expect(canTransition('Uploading', 'Uploading')).toBe(false);
  });

  /**
   * Two consecutive uploads through the bridge alone.
   *
   * `Uploaded -> Idle` has no wire trigger, so nothing in the stream announces it.
   * A consumer that waited for one would stop here — which is what §8.4 warns about
   * and what this SDK's machine did before the bridge existed.
   */
  it('needs no message to return to Idle between two uploads', () => {
    let state: DiagnosticsState = 'Idle';
    for (const status of ['Collecting', 'Uploading', 'Uploaded']) {
      state = applyDiagnosticsNotification(state, status);
    }
    expect(state).toBe('Uploaded');

    // The server closes the operation itself; no notification says so.
    state = 'Idle';
    for (const status of ['Collecting', 'Failed']) {
      state = applyDiagnosticsNotification(state, status);
    }
    expect(state).toBe('Failed');
  });

  it('refuses a stream the table does not allow', () => {
    // A `Failed` as the FIRST notification of an accepted operation: §8.3 has no
    // `Idle -> Failed` edge, and a station that cannot start answers `Rejected`.
    expect(() => applyDiagnosticsNotification('Idle', 'Failed')).toThrow(
      'Invalid diagnostics transition: Idle → Failed',
    );
    expect(() => applyDiagnosticsNotification('Uploaded', 'Uploading')).toThrow();
  });
});
