import { describe, it, expect } from 'vitest';
import {
  DiagnosticsStateMachine,
  canTransition,
  DIAGNOSTICS_TRANSITIONS,
  type DiagnosticsState,
} from '../../src/state-machines/DiagnosticsStateMachine';

const ALL: DiagnosticsState[] = ['Idle', 'Collecting', 'Uploading', 'Uploaded', 'Failed'];

describe('Diagnostics SM transitions map', () => {
  it('should have an entry for every state', () => {
    for (const s of ALL) {
      expect(DIAGNOSTICS_TRANSITIONS.has(s), `missing ${s}`).toBe(true);
    }
  });
});

describe('canTransition — valid', () => {
  const valid: [DiagnosticsState, DiagnosticsState][] = [
    ['Idle', 'Collecting'],
    ['Collecting', 'Uploading'], ['Collecting', 'Failed'],
    ['Uploading', 'Uploaded'], ['Uploading', 'Failed'],
    ['Uploaded', 'Idle'],
    ['Failed', 'Idle'],
  ];

  for (const [from, to] of valid) {
    it(`${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }

  it('should have 7 valid transitions total', () => {
    expect(valid).toHaveLength(7);
  });
});

describe('canTransition — invalid', () => {
  const invalid: [DiagnosticsState, DiagnosticsState][] = [
    ['Idle', 'Idle'], ['Idle', 'Uploading'], ['Idle', 'Uploaded'], ['Idle', 'Failed'],
    ['Collecting', 'Idle'], ['Collecting', 'Collecting'], ['Collecting', 'Uploaded'],
    ['Uploading', 'Idle'], ['Uploading', 'Uploading'], ['Uploading', 'Collecting'],
    ['Uploaded', 'Uploaded'], ['Uploaded', 'Collecting'], ['Uploaded', 'Failed'],
    ['Failed', 'Failed'], ['Failed', 'Collecting'], ['Failed', 'Uploading'],
  ];

  for (const [from, to] of invalid) {
    it(`${from} → ${to} should be rejected`, () => {
      expect(canTransition(from, to)).toBe(false);
    });
  }
});

describe('DiagnosticsStateMachine class', () => {
  it('should start in Idle by default', () => {
    expect(new DiagnosticsStateMachine().state).toBe('Idle');
  });

  it('should complete happy path and return to Idle', () => {
    const sm = new DiagnosticsStateMachine();
    sm.transition('Collecting');
    sm.transition('Uploading');
    sm.transition('Uploaded');
    sm.transition('Idle');
    expect(sm.state).toBe('Idle');
  });

  it('should handle failure during collecting and return to Idle', () => {
    const sm = new DiagnosticsStateMachine();
    sm.transition('Collecting');
    sm.transition('Failed');
    sm.transition('Idle');
    expect(sm.state).toBe('Idle');
  });

  it('should handle failure during uploading and return to Idle', () => {
    const sm = new DiagnosticsStateMachine();
    sm.transition('Collecting');
    sm.transition('Uploading');
    sm.transition('Failed');
    sm.transition('Idle');
    expect(sm.state).toBe('Idle');
  });

  it('should throw on invalid transition', () => {
    const sm = new DiagnosticsStateMachine();
    expect(() => sm.transition('Uploading')).toThrow('Invalid diagnostics transition: Idle → Uploading');
  });

  it('should be reusable after completing a cycle', () => {
    const sm = new DiagnosticsStateMachine();
    // First cycle
    sm.transition('Collecting');
    sm.transition('Uploading');
    sm.transition('Uploaded');
    sm.transition('Idle');
    // Second cycle
    sm.transition('Collecting');
    sm.transition('Failed');
    sm.transition('Idle');
    expect(sm.state).toBe('Idle');
  });
});
