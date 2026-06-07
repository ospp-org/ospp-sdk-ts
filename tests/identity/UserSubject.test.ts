import { describe, it, expect } from 'vitest';
import { UserSubject } from '../../src/identity/UserSubject';

/**
 * UserSubject derivation rule — single source of truth across the OSPP
 * ecosystem (csms-server PassIssuer at issuance, RevalidationGate at
 * reconcile check #5, any firmware/sim that derives independently from
 * a UUID).
 *
 * The rule is implicitly normative via the spec's `^sub_[a-zA-Z0-9]+$`
 * regex (schemas/common/offline-pass.schema.json `sub` field, UserId
 * pattern doc in `src/types/common.ts`): a UUID-shaped string CANNOT
 * contain hyphens to satisfy the regex, so deriving the `sub` from a
 * user UUID requires stripping the hyphens. Lifted from csms-server
 * `App\Shared\ValueObjects\UserSub` v0.5.2 → SDK v0.5.3 to make the
 * rule the cross-ecosystem source of truth instead of a csms-server-
 * private rule.
 *
 * Test vectors are byte-identical with the PHP SDK counterpart
 * (`tests/Unit/ValueObjects/UserSubjectTest.php`) to prove cross-
 * language isomorphism — the whole point of the lift.
 */

describe('UserSubject.fromUserId — canonical vectors', () => {
  it('strips hyphens and prefixes sub_', () => {
    expect(UserSubject.fromUserId('user-1')).toBe('sub_user1');
  });

  it('strips all four hyphens from a full UUID', () => {
    expect(UserSubject.fromUserId('123e4567-e89b-12d3-a456-426614174000')).toBe(
      'sub_123e4567e89b12d3a456426614174000',
    );
  });

  it('leaves hyphen-free input unchanged except for the prefix', () => {
    expect(UserSubject.fromUserId('plain')).toBe('sub_plain');
  });

  it('is deterministic', () => {
    const a = UserSubject.fromUserId('abc-def-ghi');
    const b = UserSubject.fromUserId('abc-def-ghi');
    expect(a).toBe(b);
  });
});

describe('UserSubject.fromUserId — cross-language byte-equality vectors', () => {
  // These exact vectors MUST also pass byte-identical in ospp-sdk-php
  // (`tests/Unit/ValueObjects/UserSubjectTest.php`). A divergence between
  // the two SDKs would reintroduce the very drift this lift was meant
  // to eliminate.

  it('returns the bare prefix for an empty input', () => {
    expect(UserSubject.fromUserId('')).toBe('sub_');
  });

  it('returns the bare prefix for a single-hyphen input', () => {
    expect(UserSubject.fromUserId('-')).toBe('sub_');
  });

  it('strips multiple consecutive hyphens', () => {
    expect(UserSubject.fromUserId('a---b')).toBe('sub_ab');
  });

  it('handles UTF-8 safely on non-hyphen bytes', () => {
    // PHP str_replace operates on bytes; JS replaceAll on UTF-16 code units.
    // For ASCII '-' (0x2D), the two are byte-equivalent because UTF-8
    // continuation bytes (0x80-0xBF) never contain 0x2D, so multibyte
    // sequences are never split by the strip operation. This test pins
    // that invariant so a future locale-aware refactor doesn't break it.
    expect(UserSubject.fromUserId('user-é-moji🎉')).toBe('sub_userémoji🎉');
  });
});
