/**
 * The three messages that structurally cannot carry a verifiable MAC.
 *
 * Everything on the wire is signed (spec/06-security.md §5.1). Of the 47
 * message types in Chapter 03's catalogue, 44 are signed and 3 are exempt, and
 * the three are exempt because of what they ARE, not because of what they are
 * judged to be worth:
 *
 * - BootNotification REQUEST — it PRECEDES the session key. There is no key to
 *   sign with.
 * - BootNotification RESPONSE — it CARRIES the session key. A MAC computed with
 *   the key delivered inside the same message is cryptographically void: a
 *   forger who could substitute the message could substitute the key and
 *   produce a matching MAC.
 * - ConnectionLost (LWT) — it REPLACES the station. It is registered with the
 *   broker at CONNECT time and published after the station is gone; on a
 *   reconnect the station holds key N-1 while the server has rotated to key N,
 *   so a will-MAC is guaranteed stale on arrival.
 *
 * Integrity for all three comes from mTLS. Their exemption is unconditional: it
 * holds in `All` mode and is not something a deployment can turn off.
 *
 * This module replaces CriticalMessageRegistry. The `Critical` mode selected
 * nothing once everything was signed, and the 47-row per-message classification
 * table went with it (§5.1): "A rule requiring per-message judgement produced
 * three wrong answers out of forty-seven, each defensible when written, each
 * discovered later and separately."
 */

import { OsppAction } from '../actions/OsppAction.js';
import { MessageType } from '../enums/MessageType.js';

/**
 * §5.1: "Two modes are defined". `Critical` is removed rather than deprecated —
 * with everything signed it selected nothing.
 *
 * Both values are PascalCase; lowercase spellings were drift, not an
 * alternative form, and a receiver MUST NOT accept them.
 */
export type MessageSigningMode = 'All' | 'None';

/** §5.1: "`All` **(default)**". The default moves from `Critical` to `All`. */
export const DEFAULT_MESSAGE_SIGNING_MODE: MessageSigningMode = 'All';

/**
 * Keyed on (action, messageType), not on action alone: the BootNotification
 * REQUEST and its RESPONSE are exempt for two DIFFERENT structural reasons, and
 * ConnectionLost is exempt only as the broker's LWT EVENT.
 */
type SigningKey = `${string}:${MessageType}`;

function key(action: string, messageType: MessageType): SigningKey {
  return `${action}:${messageType}`;
}

/** The three. There are no others, in any mode. */
export const STRUCTURAL_EXEMPTIONS: ReadonlySet<SigningKey> = new Set<SigningKey>([
  key(OsppAction.BOOT_NOTIFICATION, MessageType.REQUEST), // Precedes the key
  key(OsppAction.BOOT_NOTIFICATION, MessageType.RESPONSE), // Carries the key
  key(OsppAction.CONNECTION_LOST, MessageType.EVENT), // Replaces the station
]);

export function isStructurallyExempt(action: string, messageType: MessageType): boolean {
  return STRUCTURAL_EXEMPTIONS.has(key(action, messageType));
}

/** In declaration order, so the two SDKs report the same list. */
export function allStructuralExemptions(): string[] {
  return [...STRUCTURAL_EXEMPTIONS];
}

/**
 * Must this message carry a `mac`?
 *
 * The three structural exemptions are checked FIRST and hold in every mode:
 * "Their exemption is unconditional: it holds in `All` mode, and it is not
 * something a deployment can turn off" (§5.6).
 *
 * Otherwise `All` signs everything — there is no per-message judgement left, so
 * an action this SDK has never heard of is signed rather than exempted.
 */
export function requiresMac(
  action: OsppAction | string,
  messageType: MessageType,
  mode: MessageSigningMode = DEFAULT_MESSAGE_SIGNING_MODE,
): boolean {
  if (isStructurallyExempt(action, messageType)) {
    return false;
  }

  return mode === 'All';
}

/**
 * The verification side of the same question.
 *
 * Deliberately identical: §5.7 makes the two paths the same condition read from
 * two ends, and a receiver that expected a MAC the sender did not owe would
 * reject conforming traffic.
 */
export function requiresMacVerification(
  action: OsppAction | string,
  messageType: MessageType,
  mode: MessageSigningMode = DEFAULT_MESSAGE_SIGNING_MODE,
): boolean {
  return requiresMac(action, messageType, mode);
}
