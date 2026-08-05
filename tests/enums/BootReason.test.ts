import { describe, it, expect } from 'vitest';
import { BootReason } from '../../src/enums/BootReason';

describe('BootReason', () => {
  it('should have exactly 8 values', () => {
    // v0.11.0: +RemoteReset (a commanded return, reset.md §5 rule 6) and
    // +Reconnect (no boot occurred, boot-notification.md §5.2).
    expect(Object.values(BootReason)).toHaveLength(8);
  });

  it('should have unique PascalCase string values', () => {
    const values = Object.values(BootReason);
    expect(new Set(values).size).toBe(values.length);
  });

  it('should contain exactly the spec-defined values', () => {
    const expected = [
      'PowerOn',
      'Watchdog',
      'FirmwareUpdate',
      'RemoteReset',
      'ManualReset',
      'ScheduledReset',
      'ErrorRecovery',
      'Reconnect',
    ];
    expect(Object.values(BootReason).sort()).toEqual([...expected].sort());
  });
});
