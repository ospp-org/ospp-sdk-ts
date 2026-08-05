import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  STRUCTURAL_EXEMPTIONS,
  requiresMac,
  requiresMacVerification,
  DEFAULT_MESSAGE_SIGNING_MODE,
} from '../../src/crypto/MessageSigningRegistry';
import { OsppAction } from '../../src/actions/OsppAction';
import { MessageType } from '../../src/enums/MessageType';

/**
 * Cross-language signing-classification parity (sdk-ts side).
 *
 * The shared fixture signing-classification.json is BYTE-IDENTICAL with
 * ospp-sdk-php (tests/Contract/Crypto/fixtures/signing-classification.json) and
 * encodes spec §5.6 as data.
 *
 * It is now EXHAUSTIVE — all 47 message types, each with the answer
 * `requiresMac` must give in `All` mode — because §5.6 removed per-message
 * judgement entirely. Both SDKs assert every row, so a signing rule implemented
 * in one language and not the other turns one repo's suite RED.
 *
 * It also asserts the intentional asymmetry from the TS side: the three PHP
 * REST-only actions (IssueOfflinePass / RevokeOfflinePass /
 * WebPaymentAuthorization) are absent from sdk-ts entirely.
 */

interface ClassificationRow {
  action: string;
  messageType: string;
  signedInAll: boolean;
}

interface Classification {
  modes: string[];
  defaultMode: string;
  structuralExemptions: { action: string; messageType: string }[];
  totals: { messageTypes: number; signedInAll: number; structurallyExempt: number };
  phpApiOnlySuperset: string[];
  messages: ClassificationRow[];
}

const here = dirname(fileURLToPath(import.meta.url));
const classification = JSON.parse(
  readFileSync(join(here, 'fixtures', 'signing-classification.json'), 'utf-8'),
) as Classification;

const keyOf = (row: { action: string; messageType: string }): string =>
  `${row.action}:${row.messageType}`;

describe('cross-language signing classification (parity with ospp-sdk-php)', () => {
  it('agrees on the mode vocabulary and the default', () => {
    expect(classification.modes).toEqual(['All', 'None']);
    expect(classification.defaultMode).toBe(DEFAULT_MESSAGE_SIGNING_MODE);
  });

  it('STRUCTURAL_EXEMPTIONS equals the shared spec §5.6 set (3 rows)', () => {
    const expected = classification.structuralExemptions.map(keyOf).sort();
    const actual = [...STRUCTURAL_EXEMPTIONS].sort();

    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(3);
  });

  it('covers all 47 message types, 44 signed and 3 exempt', () => {
    expect(classification.messages).toHaveLength(classification.totals.messageTypes);
    expect(classification.totals.messageTypes).toBe(47);
    expect(classification.messages.filter((r) => r.signedInAll)).toHaveLength(44);
    expect(classification.messages.filter((r) => !r.signedInAll)).toHaveLength(3);
  });

  it('requiresMac matches the fixture on EVERY row, in All mode', () => {
    for (const row of classification.messages) {
      expect(
        requiresMac(row.action as OsppAction, row.messageType as MessageType, 'All'),
        keyOf(row),
      ).toBe(row.signedInAll);
    }
  });

  it('requiresMac is false on every row in None mode', () => {
    for (const row of classification.messages) {
      expect(
        requiresMac(row.action as OsppAction, row.messageType as MessageType, 'None'),
        keyOf(row),
      ).toBe(false);
    }
  });

  /**
   * §5.7 makes the sending and receiving paths the same condition read from two
   * ends. A receiver that expected a MAC the sender did not owe would reject
   * conforming traffic, so the two answers must never differ.
   */
  it('the send and verify sides agree on every row, in every mode', () => {
    for (const mode of classification.modes as ('All' | 'None')[]) {
      for (const row of classification.messages) {
        const action = row.action as OsppAction;
        const type = row.messageType as MessageType;
        expect(requiresMacVerification(action, type, mode), `${keyOf(row)} in ${mode}`).toBe(
          requiresMac(action, type, mode),
        );
      }
    }
  });

  it('the PHP REST-only superset is absent from sdk-ts (intentional asymmetry)', () => {
    const tsActions = new Set<string>(Object.values(OsppAction));

    for (const action of classification.phpApiOnlySuperset) {
      expect(tsActions.has(action)).toBe(false);
      expect(classification.messages.some((r) => r.action === action)).toBe(false);
    }
  });
});
