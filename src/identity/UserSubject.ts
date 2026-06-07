/**
 * UserSubject — canonical derivation of the OSPP user subject identifier
 * (`sub_*`) from a user UUID.
 *
 * Single source of truth across the OSPP ecosystem:
 *
 *   - Server-side pass issuance (`sub` field in the signed OfflinePass body).
 *   - Server-side reconcile-time revalidation (check #5 in
 *     `spec/profiles/reconciliation.md §6.1`: envelope `userId` vs the
 *     `sub` derived from the resolved pass's stored `user_id` UUID).
 *   - Any firmware, simulator, or alternative pass issuer that derives a
 *     `sub_*` independently from a user UUID — using the same rule keeps
 *     the wire form byte-identical across implementations.
 *
 * The rule is implicitly normative via the spec's `^sub_[a-zA-Z0-9]+$`
 * pattern on the OfflinePass `sub` field (`schemas/common/offline-pass.
 * schema.json` and the `UserId` doc-comment in `src/types/common.ts`):
 * a UUID-shaped string CANNOT contain hyphens and satisfy the regex,
 * so deriving `sub` from a UUID requires stripping the hyphens.
 *
 * Lifted from csms-server `App\Shared\ValueObjects\UserSub` in SDK
 * v0.5.3 (was csms-server-private prior to v0.5.3).
 *
 * Byte-identical with the PHP SDK counterpart
 * (`Ospp\Protocol\ValueObjects\UserSubject::fromUserId`).
 */
export class UserSubject {
  /**
   * Derive the `sub_*` form from a user UUID.
   *
   * Algorithm: strip every ASCII hyphen (0x2D) from the input, then
   * prefix with the literal `sub_`. Deterministic, salt-free, and
   * byte-identical to the PHP SDK counterpart
   * (`Ospp\Protocol\ValueObjects\UserSubject::fromUserId`).
   *
   * @param userId  User UUID (or any UUID-shaped identifier).
   *                Empty string is allowed and yields `'sub_'`.
   * @returns       `sub_` + input with all hyphens removed.
   */
  static fromUserId(userId: string): string {
    return 'sub_' + userId.replaceAll('-', '');
  }
}
