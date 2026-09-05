/**
 * The two codes the topology/programs arc adds — spec/07-errors.md §3.3.
 *
 * Mirrored by ospp-sdk-php tests/Contract/Enums/ProgramAndTopologyErrorCodeContractTest.php,
 * which asserts the same facts on the same inputs.
 */

import { describe, it, expect } from 'vitest';
import { OsppErrorCode, OSPP_ERROR_REGISTRY } from '../../src/enums/OsppErrorCode';

describe('3017 PROGRAM_NOT_DECLARED', () => {
  /**
   * §3.3: "3017 | `PROGRAM_NOT_DECLARED` | Error | false | The `programNumber`
   * in the request was never declared for the target bay."
   */
  it('is 3017, Error, not recoverable', () => {
    expect(OsppErrorCode.PROGRAM_NOT_DECLARED).toBe(3017);

    const meta = OSPP_ERROR_REGISTRY[OsppErrorCode.PROGRAM_NOT_DECLARED];
    expect(meta.code).toBe(3017);
    expect(meta.text).toBe('PROGRAM_NOT_DECLARED');
    expect(meta.severity).toBe('Error');
    // "A reference failure, not a value failure" — and not recoverable by
    // retrying the same message: the ordinal names nothing on that bay.
    expect(meta.recoverable).toBe(false);
    expect(meta.category).toBe('Session');
  });
});

describe('3018 TOPOLOGY_MISMATCH', () => {
  /**
   * §3.3: "3018 | `TOPOLOGY_MISMATCH` | Error | true | The topology the station
   * declared in BootNotification does not match the topology recorded for it at
   * provisioning [...] `recoverable: true` records exactly that — the station is
   * out of service but reachable."
   */
  it('is 3018, Error, recoverable', () => {
    expect(OsppErrorCode.TOPOLOGY_MISMATCH).toBe(3018);

    const meta = OSPP_ERROR_REGISTRY[OsppErrorCode.TOPOLOGY_MISMATCH];
    expect(meta.code).toBe(3018);
    expect(meta.text).toBe('TOPOLOGY_MISMATCH');
    expect(meta.severity).toBe('Error');
    expect(meta.recoverable).toBe(true);
    expect(meta.category).toBe('Session');
  });

  /**
   * In 3xxx, not the transport range: "it is a disagreement about hardware, not
   * a transport failure."
   */
  it('is a Session & Bay code, not a transport one', () => {
    expect(OsppErrorCode.TOPOLOGY_MISMATCH).toBeGreaterThanOrEqual(3000);
    expect(OsppErrorCode.TOPOLOGY_MISMATCH).toBeLessThan(4000);
    expect(OsppErrorCode.PROGRAM_NOT_DECLARED).toBeGreaterThanOrEqual(3000);
    expect(OsppErrorCode.PROGRAM_NOT_DECLARED).toBeLessThan(4000);
  });
});

describe('registry totals', () => {
  /**
   * "3xxx is dense with no gaps, so allocation is dense and gaps are never
   * back-filled. Registry totals move 114 -> 118."
   */
  it('is 119 codes, with a dense 3xxx range', () => {
    const codes = Object.values(OsppErrorCode).filter((v): v is number => typeof v === 'number');
    expect(codes).toHaveLength(119);

    const threeK = codes.filter((c) => c >= 3000 && c < 4000).sort((a, b) => a - b);
    const expected = Array.from({ length: 20 }, (_, i) => 3000 + i);
    expect(threeK).toEqual(expected);
    expect(threeK).toHaveLength(20);
  });

  it('has a registry entry for every code', () => {
    const codes = Object.values(OsppErrorCode).filter((v): v is number => typeof v === 'number');
    for (const code of codes) {
      expect(OSPP_ERROR_REGISTRY[code as OsppErrorCode], `missing meta for ${code}`).toBeDefined();
    }
  });
});

describe('the narrowing of 3015', () => {
  /**
   * §3.3: "this code covers a value that could never be valid. It does NOT cover
   * a well-formed identifier that simply refers to nothing — those are reference
   * failures and each identifier kind has its own code (`3004` `serviceId`,
   * `3005` `bayId`, `3006` `sessionId`, `3012` `reservationId`, `3017`
   * `programNumber`)."
   *
   * Pinned as data so the two SDKs answer the same code for the same kind.
   */
  it('gives each identifier kind its own reference-failure code', () => {
    const byKind = {
      serviceId: OsppErrorCode.INVALID_SERVICE,
      bayId: OsppErrorCode.BAY_NOT_FOUND,
      sessionId: OsppErrorCode.SESSION_NOT_FOUND,
      reservationId: OsppErrorCode.RESERVATION_NOT_FOUND,
      programNumber: OsppErrorCode.PROGRAM_NOT_DECLARED,
    };

    expect(byKind).toEqual({
      serviceId: 3004,
      bayId: 3005,
      sessionId: 3006,
      reservationId: 3012,
      programNumber: 3017,
    });

    // None of them is 3015: a dangling reference is not a bad value.
    for (const [kind, code] of Object.entries(byKind)) {
      expect(code, `${kind} must not resolve to 3015`).not.toBe(OsppErrorCode.PAYLOAD_INVALID);
    }
  });
});
