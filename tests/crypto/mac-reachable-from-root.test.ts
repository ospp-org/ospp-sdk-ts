/**
 * A station must be able to verify an inbound MAC from the package ROOT.
 *
 * Everything on the wire is signed (spec/06-security.md §5.6), so verifying an
 * inbound MAC is something a STATION does on every message it receives. Station
 * and app code imports `@ospp/protocol`; `@ospp/protocol/server` is the
 * Node-only subpath. While the only MAC implementation lived behind
 * `node:crypto` on that subpath, the reference implementation could not verify
 * an inbound MAC at all from the entry point its own consumers use.
 *
 * That is packaging, not cryptography. This pins the fix.
 */

import { describe, it, expect } from 'vitest';

describe('MAC reachability from the package root', () => {
  it('exports verifyMac, computeMac and signMessage from "."', async () => {
    const root = await import('../../src/index.js');

    expect(typeof root.verifyMac).toBe('function');
    expect(typeof root.computeMac).toBe('function');
    expect(typeof root.signMessage).toBe('function');
    expect(typeof root.isUsableSessionKey).toBe('function');
  });

  it('round-trips a sign/verify from the root entry alone', async () => {
    const { signMessage, verifyMac } = await import('../../src/index.js');

    const key = Buffer.alloc(32, 7).toString('base64');
    const message = { action: 'StartService', payload: { bayId: 'bay_a1b2c3d4e5f6' } };

    const signed = signMessage(key, message);
    expect(typeof signed.mac).toBe('string');
    expect(verifyMac(key, signed)).toBe(true);

    // Tampering is caught.
    expect(verifyMac(key, { ...signed, action: 'StopService' })).toBe(false);
  });

  it('agrees byte-for-byte with the /server implementation', async () => {
    const root = await import('../../src/index.js');
    const server = await import('../../src/server.js');

    const key = Buffer.alloc(32, 42).toString('base64');
    const message = { action: 'Heartbeat', n: 1, nested: { b: 2, a: 1 } };

    // The two entry points are the same implementation; if they ever diverge,
    // a station and a server would disagree about a MAC over one message.
    expect(root.computeMac(key, message)).toBe(server.computeMac(key, message));
    expect(server.verifyMac(key, root.signMessage(key, message))).toBe(true);
    expect(root.verifyMac(key, server.signMessage(key, message))).toBe(true);
  });
});
