/**
 * Version negotiation is exact match — VERSIONING.md.
 *
 * Mirrored by ospp-sdk-php
 * tests/Contract/ValueObjects/ExactMatchNegotiationContractTest.php.
 *
 * This SDK had NO ProtocolVersion at all before this arc — `protocolVersion`
 * was a bare string on the envelope and `supportedVersions` was declared on the
 * Rejected boot response and never read. ospp-sdk-php had a value object
 * carrying `isCompatibleWith()`, the MAJOR rule this arc deletes. So the two
 * SDKs disagreed by one implementing the superseded rule and the other
 * implementing nothing.
 */

import { describe, it, expect } from 'vitest';
import { ProtocolVersion } from '../../src/types/ProtocolVersion';

describe('exact-match negotiation', () => {
  /**
   * VERSIONING.md: "**Negotiation is exact match.** At boot the station
   * declares one version in `BootNotification`'s envelope. The server holds a
   * **set** of versions it supports. If the declared version is a member of
   * that set, the server responds `Accepted`."
   */
  it('decides by membership of the supported set', () => {
    const supported = [ProtocolVersion.fromString('0.3.0'), ProtocolVersion.fromString('0.4.0')];

    expect(ProtocolVersion.fromString('0.3.0').isSupportedBy(supported)).toBe(true);
    expect(ProtocolVersion.fromString('0.4.0').isSupportedBy(supported)).toBe(true);
    expect(ProtocolVersion.fromString('0.5.0').isSupportedBy(supported)).toBe(false);
  });

  /**
   * VERSIONING.md: "There is no compatibility relation. `0.3.0` and `0.4.0` are
   * different versions and neither implies the other; a server that supports
   * both says so by listing both."
   *
   * The deleted rule classified these as compatible because MAJOR is 0 for
   * every version OSPP has shipped. The contradiction cost money: a `0.4.0`
   * station accepted by a `0.3.0` server delivers a full session and emits
   * `SessionEnded` with a `reason` the older schema rejects — and SessionEnded
   * is the sole billing source when no StopService was issued.
   */
  it('treats a shared MAJOR as implying nothing', () => {
    const server = [ProtocolVersion.fromString('0.3.0')];

    expect(ProtocolVersion.fromString('0.4.0').isSupportedBy(server)).toBe(false);
    expect(ProtocolVersion.fromString('0.1.0').isSupportedBy(server)).toBe(false);
    expect(ProtocolVersion.fromString('0.10.0').isSupportedBy(server)).toBe(false);
    expect(ProtocolVersion.fromString('0.3.1').isSupportedBy(server)).toBe(false);
  });

  /**
   * An empty supported set accepts nothing. A server that has configured no
   * versions supports no station — it does not silently accept every one.
   */
  it('accepts nothing against an empty supported set', () => {
    expect(ProtocolVersion.fromString('0.3.0').isSupportedBy([])).toBe(false);
  });

  it('has exact equality, which negotiation is defined in terms of', () => {
    const a = ProtocolVersion.fromString('0.3.0');

    expect(a.equals(ProtocolVersion.fromString('0.3.0'))).toBe(true);
    expect(a.equals(ProtocolVersion.fromString('0.3.1'))).toBe(false);
  });

  it('exposes no MAJOR-compatibility relation', () => {
    const v = ProtocolVersion.fromString('0.3.0') as unknown as Record<string, unknown>;
    expect(v.isCompatibleWith).toBeUndefined();
  });
});

describe('parsing', () => {
  it('accepts MAJOR.MINOR.PATCH and exposes the components', () => {
    const v = ProtocolVersion.fromString('0.10.2');

    expect(v.major).toBe(0);
    expect(v.minor).toBe(10);
    expect(v.patch).toBe(2);
    expect(v.value).toBe('0.10.2');
    expect(String(v)).toBe('0.10.2');
  });

  it('rejects anything that is not three dot-separated integers', () => {
    for (const bad of ['', '0.3', '0.3.0.1', 'v0.3.0', '0.3.x', 'x.y.z', '0.3.0-rc1', ' 0.3.0']) {
      expect(() => ProtocolVersion.fromString(bad), bad).toThrow();
    }
  });
});
