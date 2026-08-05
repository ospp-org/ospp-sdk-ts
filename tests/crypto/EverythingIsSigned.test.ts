/**
 * Everything on the wire is signed — spec/06-security.md §5.1, §5.6, §5.7.
 *
 * Mirrored by ospp-sdk-php tests/Contract/Crypto/EverythingIsSignedContractTest.php.
 */

import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  STRUCTURAL_EXEMPTIONS,
  allStructuralExemptions,
  requiresMac,
  DEFAULT_MESSAGE_SIGNING_MODE,
  type MessageSigningMode,
} from '../../src/crypto/MessageSigningRegistry';
import { computeMac, verifyMac, canonicalizeToBytes } from '../../src/server';
import { OsppAction } from '../../src/actions/OsppAction';
import { MessageType } from '../../src/enums/MessageType';

const ALL_MODES: MessageSigningMode[] = ['All', 'None'];

describe('the signing mode', () => {
  /**
   * §5.1: "Two modes are defined: `All` (default) [...] `None`."
   * §5.1: "The middle mode, `Critical`, is removed rather than deprecated.
   * With everything signed it selected nothing."
   */
  it('is exactly All and None', () => {
    // The union is compile-time; this pins the runtime list the SDK ships.
    expect(ALL_MODES).toEqual(['All', 'None']);
  });

  /** §5.1: "`All` **(default)**". The default moves from `Critical` to `All`. */
  it('defaults to All', () => {
    expect(DEFAULT_MESSAGE_SIGNING_MODE).toBe('All');
  });
});

describe('the three structural exemptions', () => {
  /**
   * §5.6: "every MQTT message MUST carry a valid `mac`, in either direction,
   * with exactly three exceptions. There are no other exemptions, no
   * per-message judgement, and no 'informational' category."
   */
  it('is exactly three, per (action, messageType)', () => {
    expect(allStructuralExemptions()).toEqual([
      'BootNotification:Request',
      'BootNotification:Response',
      'ConnectionLost:Event',
    ]);
    expect(STRUCTURAL_EXEMPTIONS.size).toBe(3);
  });

  /**
   * §5.6: "Their exemption is unconditional: it holds in `All` mode, and it is
   * not something a deployment can turn off."
   */
  it('holds in every mode', () => {
    for (const mode of ALL_MODES) {
      expect(requiresMac(OsppAction.BOOT_NOTIFICATION, MessageType.REQUEST, mode)).toBe(false);
      expect(requiresMac(OsppAction.BOOT_NOTIFICATION, MessageType.RESPONSE, mode)).toBe(false);
      expect(requiresMac(OsppAction.CONNECTION_LOST, MessageType.EVENT, mode)).toBe(false);
    }
  });
});

describe('everything else', () => {
  /**
   * §5.6: "Of the 47 message types [...] 44 are signed and 3 are exempt."
   *
   * In `All` there is no per-message judgement left: anything that is not one
   * of the three is signed, including a message this SDK has never heard of.
   */
  it('is signed in All mode', () => {
    const notExempt: [OsppAction, MessageType][] = [
      [OsppAction.HEARTBEAT, MessageType.REQUEST],
      [OsppAction.STATUS_NOTIFICATION, MessageType.EVENT],
      [OsppAction.METER_VALUES, MessageType.EVENT],
      [OsppAction.GET_DIAGNOSTICS, MessageType.REQUEST],
      [OsppAction.START_SERVICE, MessageType.REQUEST],
      // ConnectionLost is exempt only as the broker's LWT EVENT.
      [OsppAction.CONNECTION_LOST, MessageType.REQUEST],
    ];

    for (const [action, type] of notExempt) {
      expect(requiresMac(action, type, 'All'), `${action}:${type}`).toBe(true);
    }

    expect(
      requiresMac('SomeActionThisSdkHasNeverHeardOf' as OsppAction, MessageType.REQUEST, 'All'),
    ).toBe(true);
  });

  /** §5.6, Mode `None`: "No message carries a MAC." */
  it('is unsigned in None mode', () => {
    expect(requiresMac(OsppAction.START_SERVICE, MessageType.REQUEST, 'None')).toBe(false);
    expect(requiresMac(OsppAction.HEARTBEAT, MessageType.REQUEST, 'None')).toBe(false);
  });
});

describe('§5.7 — both directions fail closed', () => {
  const payload = { action: 'StartService' };
  const unusable = ['', '   ', '!!!not-base64!!!'];

  /**
   * §5.7 Sending: "A sender holding no key MUST refuse to send. It MUST NOT
   * publish the message unsigned. It MUST log the refusal [...] and MUST NOT
   * silently drop it without a record."
   *
   * Refusing loudly is the only option that is neither of the two the clause
   * forbids, so the signer throws rather than returning something.
   */
  it('refuses to sign with no key, rather than emitting unsigned', () => {
    for (const key of unusable) {
      expect(() => computeMac(key, payload), `key ${JSON.stringify(key)}`).toThrow(/session key/i);
    }
  });

  /**
   * §5.7 Receiving: "No session key held for the peer | `1013 MAC_MISSING` |
   * Reject the message. A receiver that holds no key cannot verify, and cannot
   * therefore accept."
   *
   * Verification returns false rather than throwing: a receiver rejects a
   * message, it does not crash on one.
   */
  it('rejects on verify with no key, rather than accepting', () => {
    for (const key of unusable) {
      expect(verifyMac(key, { ...payload, mac: 'any-mac-at-all' }), `key ${JSON.stringify(key)}`).toBe(
        false,
      );
    }
  });

  /**
   * The fail-open this replaces: an unusable key silently degraded to the EMPTY
   * HMAC key, so two peers both holding garbage verified each other
   * successfully and an attacker who knew the key was invalid could forge with
   * the empty one.
   */
  it('does not degrade an unusable key to the empty HMAC key', () => {
    const emptyKeyMac = createHmac('sha256', Buffer.alloc(0))
      .update(canonicalizeToBytes(payload))
      .digest('base64');

    expect(verifyMac('', { ...payload, mac: emptyKeyMac })).toBe(false);
    expect(verifyMac('!!!not-base64!!!', { ...payload, mac: emptyKeyMac })).toBe(false);
  });
});
