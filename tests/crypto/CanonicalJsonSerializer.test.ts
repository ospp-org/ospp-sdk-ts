import { describe, it, expect } from 'vitest';
import { canonicalize, canonicalizeForMac } from '../../src/crypto/CanonicalJsonSerializer';
import { canonicalizeToBytes } from '../../src/crypto/CanonicalJsonBytes';

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

    // §5.3, so canonicalizeForMac: the worked example strips `mac` before
    // canonicalizing. Plain canonicalize() is §4.8 and keeps it.
    expect(canonicalizeForMac(message)).toBe(expected);
    expect(canonicalize(message)).toContain('"mac":"will-be-removed"');
  });

  // Until 0.14.0 canonicalize() deleted a top-level `mac`. It no longer does:
  // that is §5.3 step 1, not §4.8, and ospp-sdk-php never did it here either.
  it('does NOT remove mac — canonical form is §4.8 and nothing else', () => {
    expect(canonicalize({ b: 1, mac: 'secret', a: 2 })).toBe('{"a":2,"b":1,"mac":"secret"}');
  });

  it('canonicalizeForMac removes a top-level mac, without mutating the caller', () => {
    const message = { b: 1, mac: 'secret', a: 2 };
    expect(canonicalizeForMac(message)).toBe('{"a":2,"b":1}');
    expect(message.mac).toBe('secret');
  });

  it('canonicalizeForMac removes only the TOP-LEVEL mac', () => {
    expect(canonicalizeForMac({ mac: 'outer', payload: { mac: 'inner' } })).toBe(
      '{"payload":{"mac":"inner"}}',
    );
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
