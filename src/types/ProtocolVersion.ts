/**
 * The wire `protocolVersion` carried in every message envelope.
 *
 * Negotiation is EXACT MATCH (VERSIONING.md): the station declares one version,
 * the server holds a set, and membership decides. There is no compatibility
 * relation — `0.3.0` and `0.4.0` are different versions and neither implies the
 * other; a server that supports both says so by listing both.
 *
 * This type is new in this arc. `protocolVersion` was previously a bare string
 * on the envelope with no comparison of any kind, while ospp-sdk-php carried a
 * value object whose `isCompatibleWith()` implemented the superseded
 * "same MAJOR is compatible" rule. The two SDKs therefore disagreed by one
 * implementing a wrong rule and the other implementing none.
 *
 * Not to be confused with the SDK package version or the specification document
 * version; `02-transport.md` §2.2 makes all three independent.
 */

const PATTERN = /^\d+\.\d+\.\d+$/;
const MAX_LENGTH = 32;

export class ProtocolVersion {
  private constructor(
    readonly major: number,
    readonly minor: number,
    readonly patch: number,
    readonly value: string,
  ) {}

  /**
   * Parse `MAJOR.MINOR.PATCH`.
   *
   * The length bound and the pattern both come from
   * `schemas/common/mqtt-envelope.schema.json`, so a string this rejects could
   * not have been on the wire.
   */
  static fromString(value: string): ProtocolVersion {
    if (typeof value !== 'string' || value.length > MAX_LENGTH || !PATTERN.test(value)) {
      throw new Error(
        `Invalid protocolVersion ${JSON.stringify(value)}: expected MAJOR.MINOR.PATCH`,
      );
    }

    const [major, minor, patch] = value.split('.').map(Number);
    return new ProtocolVersion(major, minor, patch, value);
  }

  /** Exact equality. Negotiation is defined in terms of it. */
  equals(other: ProtocolVersion): boolean {
    return this.major === other.major && this.minor === other.minor && this.patch === other.patch;
  }

  /**
   * Is this version a member of the set the peer supports?
   *
   * VERSIONING.md: "**Negotiation is exact match.** At boot the station declares
   * one version in `BootNotification`'s envelope. The server holds a **set** of
   * versions it supports. If the declared version is a member of that set, the
   * server responds `Accepted`. If it is not, the server MUST reject with error
   * code `1007` (`PROTOCOL_VERSION_MISMATCH`) and MUST include the
   * `supportedVersions` array."
   *
   * A shared MAJOR implies nothing. The deleted rule classified `0.1.0` and
   * `0.10.0` as compatible because MAJOR is `0` for every version OSPP has
   * shipped, while the pre-1.0 policy licences breaking changes between `0.x`
   * minors. The contradiction cost money — a `0.4.0` station accepted by a
   * `0.3.0` server delivers a full session and emits `SessionEnded` with a
   * `reason` the older schema rejects, and SessionEnded is the sole billing
   * source when no StopService was issued.
   *
   * An empty set supports nothing: a server that has configured no versions
   * accepts no station, rather than silently accepting every one.
   */
  isSupportedBy(supportedVersions: Iterable<ProtocolVersion>): boolean {
    for (const supported of supportedVersions) {
      if (this.equals(supported)) return true;
    }
    return false;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
