import { describe, it, expect } from 'vitest';
import { MessageSource } from '../../src/enums/MessageSource';

describe('MessageSource', () => {
  it('should have exactly 2 values', () => {
    expect(Object.values(MessageSource)).toHaveLength(2);
  });

  it('should contain exactly the spec-defined values', () => {
    expect(MessageSource.STATION).toBe('Station');
    expect(MessageSource.SERVER).toBe('Server');
  });
});
