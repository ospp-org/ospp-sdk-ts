import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  ALWAYS_EXEMPT,
  CRITICAL_MESSAGE_TYPES,
  requiresHmac,
} from '../../src/crypto/CriticalMessageRegistry';
import { OsppAction } from '../../src/actions/OsppAction';
import { MessageType } from '../../src/enums/MessageType';

/**
 * Cross-language signing-classification parity (sdk-ts side).
 *
 * The shared fixture signing-classification.json is BYTE-IDENTICAL with ospp-sdk-php
 * (tests/Contract/Crypto/fixtures/signing-classification.json) and encodes spec §5.6 as data.
 *
 * sdk-ts keys its registry by (action, messageType) — the SAME axis as the spec — so it asserts the
 * 31 critical + 3 always-exempt rows directly. ospp-sdk-php keys by action only and asserts the
 * collapsed projection of the same fixture. Both SDKs pinned to one fixture ⇒ a change to the
 * Critical set in one language that is not mirrored in the other turns one repo's suite RED.
 *
 * It also asserts the intentional asymmetry from the TS side: the three PHP REST-only actions
 * (IssueOfflinePass / RevokeOfflinePass / WebPaymentAuthorization) are absent from sdk-ts entirely.
 */

interface ClassificationRow {
  action: string;
  messageType: string;
}

interface Classification {
  criticalInCriticalMode: ClassificationRow[];
  alwaysExempt: ClassificationRow[];
  phpApiOnlySuperset: string[];
}

const here = dirname(fileURLToPath(import.meta.url));
const classification = JSON.parse(
  readFileSync(join(here, 'fixtures', 'signing-classification.json'), 'utf-8'),
) as Classification;

const keyOf = (row: ClassificationRow): string => `${row.action}:${row.messageType}`;

describe('cross-language signing classification (parity with ospp-sdk-php)', () => {
  it('CRITICAL_MESSAGE_TYPES equals the shared spec §5.6 critical set (31 rows)', () => {
    const expected = classification.criticalInCriticalMode.map(keyOf).sort();
    const actual = [...CRITICAL_MESSAGE_TYPES].sort();

    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(31);
  });

  it('ALWAYS_EXEMPT equals the shared spec §5.6 always-exempt set (3 rows)', () => {
    const expected = classification.alwaysExempt.map(keyOf).sort();
    const actual = [...ALWAYS_EXEMPT].sort();

    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(3);
  });

  it('the 31 critical message types span the 16 wire actions shared with ospp-sdk-php', () => {
    const distinct = new Set([...CRITICAL_MESSAGE_TYPES].map((k) => k.split(':')[0]));
    const fromFixture = new Set(classification.criticalInCriticalMode.map((r) => r.action));

    expect([...distinct].sort()).toEqual([...fromFixture].sort());
    expect(distinct.size).toBe(16);
  });

  it('requiresHmac is true for every spec critical message type in Critical mode', () => {
    for (const row of classification.criticalInCriticalMode) {
      expect(
        requiresHmac(row.action as OsppAction, row.messageType as MessageType, 'Critical'),
      ).toBe(true);
    }
  });

  it('always-exempt message types are never signed, even in All mode', () => {
    for (const row of classification.alwaysExempt) {
      expect(requiresHmac(row.action as OsppAction, row.messageType as MessageType, 'All')).toBe(
        false,
      );
      expect(
        requiresHmac(row.action as OsppAction, row.messageType as MessageType, 'Critical'),
      ).toBe(false);
    }
  });

  it('the PHP REST-only superset is absent from sdk-ts (intentional asymmetry)', () => {
    const tsActions = new Set<string>(Object.values(OsppAction));

    for (const action of classification.phpApiOnlySuperset) {
      // Not even an action in sdk-ts…
      expect(tsActions.has(action)).toBe(false);
      // …and therefore nowhere in the critical registry.
      const inRegistry = [...CRITICAL_MESSAGE_TYPES].some((k) => k.startsWith(`${action}:`));
      expect(inRegistry).toBe(false);
    }
  });
});
