import { describe, it, expect } from 'vitest';
import { MessageType } from '../../src/enums/MessageType';

describe('MessageType', () => {
  it('should have exactly 3 values', () => {
    expect(Object.values(MessageType)).toHaveLength(3);
  });

  it('should contain exactly the spec-defined values', () => {
    expect(MessageType.REQUEST).toBe('Request');
    expect(MessageType.RESPONSE).toBe('Response');
    expect(MessageType.EVENT).toBe('Event');
  });
});
