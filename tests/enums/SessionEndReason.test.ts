import { describe, it, expect } from 'vitest';
import { SessionEndReason } from '../../src/enums/SessionEndReason';

describe('SessionEndReason', () => {
  it('should have exactly 5 values', () => {
    expect(Object.values(SessionEndReason)).toHaveLength(5);
  });

  it('should contain exactly the spec-defined values', () => {
    expect(SessionEndReason.TIMER_EXPIRED).toBe('TimerExpired');
    expect(SessionEndReason.FAULT).toBe('Fault');
    expect(SessionEndReason.LOCAL).toBe('Local');
    expect(SessionEndReason.LOCAL_OUT_OF_CREDIT).toBe('LocalOutOfCredit');
    expect(SessionEndReason.DEAUTHORIZED).toBe('Deauthorized');
  });
});
