import { describe, it, expect } from 'vitest';
import { SessionEndReason } from '../../src/enums/SessionEndReason';

describe('SessionEndReason', () => {
  // 7 since spec 0.31.0 added Inactivity, the SessionTimeout idle stop. The
  // registry's note had declined that widening at 0.30.0 and reversed it:
  // session-ended.md §6 requires a SessionEnded for every session ending without a
  // StopService, and no member was true of an idle stop, so the obligation had no
  // legal value to satisfy it.
  it('should have exactly 7 values', () => {
    expect(Object.values(SessionEndReason)).toHaveLength(7);
  });

  it('should contain exactly the spec-defined values', () => {
    expect(SessionEndReason.TIMER_EXPIRED).toBe('TimerExpired');
    expect(SessionEndReason.FAULT).toBe('Fault');
    expect(SessionEndReason.LOCAL).toBe('Local');
    expect(SessionEndReason.LOCAL_OUT_OF_CREDIT).toBe('LocalOutOfCredit');
    expect(SessionEndReason.DEAUTHORIZED).toBe('Deauthorized');
    expect(SessionEndReason.OPERATOR_STOPPED).toBe('OperatorStopped');
    expect(SessionEndReason.INACTIVITY).toBe('Inactivity');
  });
});
