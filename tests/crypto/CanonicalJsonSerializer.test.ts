import { describe, it, expect } from 'vitest';
import { canonicalize, canonicalizeToBytes } from '../../src/crypto/CanonicalJsonSerializer';

describe('canonicalize', () => {
  it('should match the spec §5.3 example exactly', () => {
    const message = {
      protocolVersion: '0.2.1',
      messageId: 'cmd_550e8400',
      action: 'StartService',
      timestamp: '2026-01-30T12:00:00.000Z',
      source: 'Server',
      messageType: 'Request',
      payload: {
        sessionId: 'sess_a1b2c3d4',
        bayId: 'bay_c1d2e3f4a5b6',
        serviceId: 'svc_eco',
        durationSeconds: 300,
        sessionSource: 'MobileApp',
      },
      mac: 'will-be-removed',
    };

    const expected =
      '{"action":"StartService","messageId":"cmd_550e8400","messageType":"Request",' +
      '"payload":{"bayId":"bay_c1d2e3f4a5b6","durationSeconds":300,"serviceId":"svc_eco",' +
      '"sessionId":"sess_a1b2c3d4","sessionSource":"MobileApp"},' +
      '"protocolVersion":"0.2.1","source":"Server","timestamp":"2026-01-30T12:00:00.000Z"}';

    expect(canonicalize(message)).toBe(expected);
  });

  it('should remove mac field', () => {
    const result = canonicalize({ b: 1, mac: 'secret', a: 2 });
    expect(result).toBe('{"a":2,"b":1}');
    expect(result).not.toContain('mac');
  });

  it('should work when mac is absent', () => {
    const result = canonicalize({ z: 'last', a: 'first' });
    expect(result).toBe('{"a":"first","z":"last"}');
  });

  it('should sort keys alphabetically', () => {
    const result = canonicalize({ c: 3, a: 1, b: 2 });
    expect(result).toBe('{"a":1,"b":2,"c":3}');
  });

  it('should sort nested object keys recursively', () => {
    const result = canonicalize({ outer: { z: 1, a: 2 }, inner: { y: 3, b: 4 } });
    expect(result).toBe('{"inner":{"b":4,"y":3},"outer":{"a":2,"z":1}}');
  });

  it('should sort deeply nested objects', () => {
    const result = canonicalize({ a: { b: { d: 1, c: 2 } } });
    expect(result).toBe('{"a":{"b":{"c":2,"d":1}}}');
  });

  it('should preserve array element order', () => {
    const result = canonicalize({ arr: [3, 1, 2] });
    expect(result).toBe('{"arr":[3,1,2]}');
  });

  it('should sort keys inside array elements that are objects', () => {
    const result = canonicalize({ items: [{ z: 1, a: 2 }, { y: 3, b: 4 }] });
    expect(result).toBe('{"items":[{"a":2,"z":1},{"b":4,"y":3}]}');
  });

  it('should handle null values', () => {
    const result = canonicalize({ b: null, a: 1 });
    expect(result).toBe('{"a":1,"b":null}');
  });

  it('should handle boolean values', () => {
    const result = canonicalize({ b: false, a: true });
    expect(result).toBe('{"a":true,"b":false}');
  });

  it('should produce compact JSON (no whitespace)', () => {
    const result = canonicalize({ key: 'value', nested: { inner: 'data' } });
    expect(result).not.toMatch(/\s/);
  });

  it('should handle empty object', () => {
    expect(canonicalize({})).toBe('{}');
  });

  it('should handle empty nested object', () => {
    expect(canonicalize({ a: {} })).toBe('{"a":{}}');
  });

  it('should handle empty array', () => {
    expect(canonicalize({ a: [] })).toBe('{"a":[]}');
  });
});

describe('canonicalizeToBytes', () => {
  it('should return a Buffer', () => {
    const result = canonicalizeToBytes({ a: 1 });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should encode as UTF-8', () => {
    const result = canonicalizeToBytes({ a: 1 });
    expect(result.toString('utf-8')).toBe('{"a":1}');
  });

  it('should handle unicode characters', () => {
    const result = canonicalizeToBytes({ name: 'München' });
    expect(result.toString('utf-8')).toBe('{"name":"München"}');
  });
});
