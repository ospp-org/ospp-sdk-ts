import { describe, it, expect } from 'vitest';
import { BootReason } from '../../src/enums/BootReason';

describe('BootReason', () => {
  it('should have exactly 6 values', () => {
    expect(Object.values(BootReason)).toHaveLength(6);
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
      'ManualReset',
      'ScheduledReset',
      'ErrorRecovery',
    ];
    expect(Object.values(BootReason).sort()).toEqual([...expected].sort());
  });
});
