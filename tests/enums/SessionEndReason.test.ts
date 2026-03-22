import { describe, it, expect } from 'vitest';
import { SessionEndReason } from '../../src/enums/SessionEndReason';

describe('SessionEndReason', () => {
  it('should have exactly 2 values', () => {
    expect(Object.values(SessionEndReason)).toHaveLength(2);
  });

  it('should contain exactly the spec-defined values', () => {
    expect(SessionEndReason.TIMER_EXPIRED).toBe('TimerExpired');
    expect(SessionEndReason.FAULT).toBe('Fault');
  });
});
