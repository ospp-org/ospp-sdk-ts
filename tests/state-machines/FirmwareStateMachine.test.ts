import { describe, it, expect } from 'vitest';
import {
  FirmwareStateMachine,
  canTransition,
  FIRMWARE_TRANSITIONS,
  type FirmwareState,
} from '../../src/state-machines/FirmwareStateMachine';

const ALL: FirmwareState[] = [
  'Idle', 'Downloading', 'Downloaded', 'Verifying', 'Verified',
  'Installing', 'Installed', 'Rebooting', 'Activated', 'Failed',
];

describe('Firmware SM transitions map', () => {
  it('should have entries for all non-terminal states', () => {
    for (const s of ALL.filter(s => s !== 'Activated')) {
      expect(FIRMWARE_TRANSITIONS.has(s), `missing ${s}`).toBe(true);
    }
  });
});

describe('canTransition — valid (happy path)', () => {
  const happyPath: [FirmwareState, FirmwareState][] = [
    ['Idle', 'Downloading'],
    ['Downloading', 'Downloaded'],
    ['Downloaded', 'Verifying'],
    ['Verifying', 'Verified'],
    ['Verified', 'Installing'],
    ['Installing', 'Installed'],
    ['Installed', 'Rebooting'],
    ['Rebooting', 'Activated'],
  ];

  for (const [from, to] of happyPath) {
    it(`${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }
});

describe('canTransition — valid (failure paths)', () => {
  const failPaths: [FirmwareState, FirmwareState][] = [
    ['Downloading', 'Failed'],
    ['Verifying', 'Failed'],
    ['Installing', 'Failed'],
    ['Rebooting', 'Failed'],
    ['Failed', 'Idle'],
  ];

  for (const [from, to] of failPaths) {
    it(`${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }
});

describe('canTransition — invalid', () => {
  const invalid: [FirmwareState, FirmwareState][] = [
    ['Idle', 'Idle'], ['Idle', 'Downloaded'], ['Idle', 'Failed'], ['Idle', 'Activated'],
    ['Downloading', 'Idle'], ['Downloading', 'Installing'], ['Downloading', 'Activated'],
    ['Downloaded', 'Idle'], ['Downloaded', 'Failed'], ['Downloaded', 'Downloading'],
    ['Verifying', 'Idle'], ['Verifying', 'Downloading'], ['Verifying', 'Installing'],
    ['Verified', 'Idle'], ['Verified', 'Failed'], ['Verified', 'Downloading'],
    ['Installing', 'Idle'], ['Installing', 'Downloading'], ['Installing', 'Verified'],
    ['Installed', 'Idle'], ['Installed', 'Failed'], ['Installed', 'Downloading'],
    ['Rebooting', 'Idle'], ['Rebooting', 'Downloading'], ['Rebooting', 'Installed'],
    ['Activated', 'Idle'], ['Activated', 'Failed'], ['Activated', 'Downloading'],
    ['Failed', 'Failed'], ['Failed', 'Downloading'], ['Failed', 'Activated'],
  ];

  for (const [from, to] of invalid) {
    it(`${from} → ${to} should be rejected`, () => {
      expect(canTransition(from, to)).toBe(false);
    });
  }
});

describe('FirmwareStateMachine class', () => {
  it('should start in Idle by default', () => {
    expect(new FirmwareStateMachine().state).toBe('Idle');
  });

  it('should complete the happy path to Activated', () => {
    const sm = new FirmwareStateMachine();
    sm.transition('Downloading');
    sm.transition('Downloaded');
    sm.transition('Verifying');
    sm.transition('Verified');
    sm.transition('Installing');
    sm.transition('Installed');
    sm.transition('Rebooting');
    sm.transition('Activated');
    expect(sm.state).toBe('Activated');
  });

  it('should handle failure during download and rollback to Idle', () => {
    const sm = new FirmwareStateMachine();
    sm.transition('Downloading');
    sm.transition('Failed');
    sm.transition('Idle');
    expect(sm.state).toBe('Idle');
  });

  it('should handle failure during verification and rollback', () => {
    const sm = new FirmwareStateMachine();
    sm.transition('Downloading');
    sm.transition('Downloaded');
    sm.transition('Verifying');
    sm.transition('Failed');
    sm.transition('Idle');
    expect(sm.state).toBe('Idle');
  });

  it('should handle boot failure (watchdog rollback)', () => {
    const sm = new FirmwareStateMachine();
    sm.transition('Downloading');
    sm.transition('Downloaded');
    sm.transition('Verifying');
    sm.transition('Verified');
    sm.transition('Installing');
    sm.transition('Installed');
    sm.transition('Rebooting');
    sm.transition('Failed');
    sm.transition('Idle');
    expect(sm.state).toBe('Idle');
  });

  it('should throw on invalid transition', () => {
    const sm = new FirmwareStateMachine();
    expect(() => sm.transition('Activated')).toThrow('Invalid firmware transition: Idle → Activated');
  });

  it('should throw on transition from Activated (terminal)', () => {
    const sm = new FirmwareStateMachine('Activated');
    expect(() => sm.transition('Idle')).toThrow('Invalid firmware transition');
  });
});
