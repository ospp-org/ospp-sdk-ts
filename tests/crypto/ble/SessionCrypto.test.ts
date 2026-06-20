import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validatePublicKey } from '../../../src/crypto/ble/SessionCrypto';

/**
 * BLE SessionCrypto — validated against the spec handshake oracle
 * (tests/crypto/fixtures/ble-handshake-keyschedule.json, byte-identical to spec
 * conformance/test-vectors/crypto/). Reference impl = spec tools/ble-crypto.mjs.
 *
 * P1 = first 2 of the 10-function pipeline: validatePublicKey (Pin 2 / §6.5.2),
 * ecdhSharedX (Pin 1 / §6.5). Transcript / key schedule / sessionProof / AEAD /
 * cert verify are P2-P5.
 */

interface KeyEntry {
  label: string;
  privateKeyHex: string;
  publicKeyCompressedBase64: string;
  publicKeyUncompressedHex: string;
}
interface Scenario {
  scenario: string;
  ecdh: { esHex: string; eeHex: string };
}
interface Vector {
  specRef: string;
  keys: Record<string, KeyEntry>;
  scenarios: Scenario[];
}

const here = dirname(fileURLToPath(import.meta.url));
const vector = JSON.parse(
  readFileSync(join(here, '..', 'fixtures', 'ble-handshake-keyschedule.json'), 'utf-8'),
) as Vector;
const keys = vector.keys;

const b64ToBytes = (b: string): Uint8Array => Uint8Array.from(Buffer.from(b, 'base64'));
const hexToBytes = (h: string): Uint8Array => Uint8Array.from(Buffer.from(h, 'hex'));

const KEY_LABELS = [
  'stationStatic',
  'appEphemeralFull',
  'stationEphemeralFull',
  'appEphemeralMinimal',
  'stationEphemeralMinimal',
] as const;

describe('SessionCrypto.validatePublicKey (Pin 2 / §6.5.2)', () => {
  it('accepts every valid compressed (44-char SEC1) public key in the corpus', () => {
    for (const label of KEY_LABELS) {
      expect(() => validatePublicKey(b64ToBytes(keys[label].publicKeyCompressedBase64))).not.toThrow();
    }
  });

  it('accepts the uncompressed (0x04) SEC1 form too', () => {
    expect(() => validatePublicKey(hexToBytes(keys.stationStatic.publicKeyUncompressedHex))).not.toThrow();
  });

  it('rejects an invalid SEC1 prefix byte (0x05)', () => {
    const bad = b64ToBytes(keys.stationStatic.publicKeyCompressedBase64);
    bad[0] = 0x05;
    expect(() => validatePublicKey(bad)).toThrow();
  });

  it('rejects an out-of-field / off-curve X (0x02 ‖ 0xff*32)', () => {
    const bad = new Uint8Array(33);
    bad[0] = 0x02;
    bad.fill(0xff, 1);
    expect(() => validatePublicKey(bad)).toThrow();
  });

  it('rejects a truncated key', () => {
    const bad = b64ToBytes(keys.stationStatic.publicKeyCompressedBase64).subarray(0, 20);
    expect(() => validatePublicKey(bad)).toThrow();
  });

  it('bite: byte-flips in the X coordinate of a valid key are rejected (curve check is live)', () => {
    const valid = b64ToBytes(keys.appEphemeralFull.publicKeyCompressedBase64);
    expect(() => validatePublicKey(valid)).not.toThrow();
    let rejected = 0;
    for (let i = 1; i < valid.length; i++) {
      const mutated = Uint8Array.from(valid);
      mutated[i] ^= 0xff;
      try {
        validatePublicKey(mutated);
      } catch {
        rejected++;
      }
    }
    // A no-op validator would reject 0; the curve/field check must catch mutations.
    expect(rejected).toBeGreaterThan(0);
  });
});
