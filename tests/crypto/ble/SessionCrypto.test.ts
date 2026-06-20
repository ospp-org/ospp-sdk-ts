import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validatePublicKey, ecdhSharedX, leftPad32, transcriptHash } from '../../../src/crypto/ble/SessionCrypto';

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
  hello: { wireBase64: string; message: { deviceId: string; appNonce: string } };
  challenge: { wireBase64: string; message: { stationNonce: string } };
  transcript: { transcriptHashHex: string };
  ecdh: { esHex: string; eeHex: string };
  keySchedule: {
    sessionKeyHex: string;
    kAppToStationHex: string;
    kStationToAppHex: string;
    sessionKeyConfirmationBase64: string;
  };
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
const toHex = (u8: Uint8Array): string => Buffer.from(u8).toString('hex');

// Per scenario, which app/station ephemeral key pair is in play (stationStatic is shared).
const SCENARIO_KEYS: Record<string, { appEph: string; stationEph: string }> = {
  full: { appEph: 'appEphemeralFull', stationEph: 'stationEphemeralFull' },
  minimal: { appEph: 'appEphemeralMinimal', stationEph: 'stationEphemeralMinimal' },
};

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

describe('SessionCrypto.leftPad32 (Pin 1 — unconditional 32-byte width)', () => {
  it('is a no-op (32-byte copy) on a full-width input', () => {
    const out = leftPad32(hexToBytes('ff'.repeat(32)));
    expect(out.length).toBe(32);
    expect(toHex(out)).toBe('ff'.repeat(32));
  });

  it('left-pads a short (high-zero-byte) value — the ~1/256 EC-scalar parity case', () => {
    const out = leftPad32(hexToBytes('ab'.repeat(31))); // 31-byte big-endian value
    expect(out.length).toBe(32);
    expect(out[0]).toBe(0x00);
    expect(toHex(out)).toBe('00' + 'ab'.repeat(31));
  });

  it('rejects an over-width (>32-byte) input', () => {
    expect(() => leftPad32(hexToBytes('ab'.repeat(33)))).toThrow();
  });
});

describe('SessionCrypto.ecdhSharedX (Pin 1 / §6.5)', () => {
  for (const scenario of vector.scenarios) {
    const map = SCENARIO_KEYS[scenario.scenario];
    const appPriv = hexToBytes(keys[map.appEph].privateKeyHex);
    const appPub = b64ToBytes(keys[map.appEph].publicKeyCompressedBase64);
    const statStaticPriv = hexToBytes(keys.stationStatic.privateKeyHex);
    const statStaticPub = b64ToBytes(keys.stationStatic.publicKeyCompressedBase64);
    const statEphPriv = hexToBytes(keys[map.stationEph].privateKeyHex);
    const statEphPub = b64ToBytes(keys[map.stationEph].publicKeyCompressedBase64);

    describe(`scenario ${scenario.scenario}`, () => {
      it('es = ECDH(appEphemeralPriv, stationStaticPub) reproduces esHex — both directions agree', () => {
        expect(toHex(ecdhSharedX(appPriv, statStaticPub))).toBe(scenario.ecdh.esHex); // app side
        expect(toHex(ecdhSharedX(statStaticPriv, appPub))).toBe(scenario.ecdh.esHex); // station side
      });

      it('ee = ECDH(appEphemeralPriv, stationEphemeralPub) reproduces eeHex — both directions agree', () => {
        expect(toHex(ecdhSharedX(appPriv, statEphPub))).toBe(scenario.ecdh.eeHex); // app side
        expect(toHex(ecdhSharedX(statEphPriv, appPub))).toBe(scenario.ecdh.eeHex); // station side
      });
    });
  }

  it('output is exactly 32 bytes (Pin 1, left-padded X)', () => {
    const x = ecdhSharedX(
      hexToBytes(keys.appEphemeralFull.privateKeyHex),
      b64ToBytes(keys.stationStatic.publicKeyCompressedBase64),
    );
    expect(x.length).toBe(32);
  });

  it('bite: a mutated private key diverges from the vector es', () => {
    const full = vector.scenarios.find((s) => s.scenario === 'full')!;
    const appPriv = hexToBytes(keys.appEphemeralFull.privateKeyHex);
    const statStaticPub = b64ToBytes(keys.stationStatic.publicKeyCompressedBase64);
    expect(toHex(ecdhSharedX(appPriv, statStaticPub))).toBe(full.ecdh.esHex); // sanity: real key matches
    const mutated = Uint8Array.from(appPriv);
    mutated[mutated.length - 1] ^= 0x01; // flip the low bit (stays a valid scalar)
    expect(toHex(ecdhSharedX(mutated, statStaticPub))).not.toBe(full.ecdh.esHex);
  });
});

describe('SessionCrypto.transcriptHash (Pin 4 / §6.5)', () => {
  for (const scenario of vector.scenarios) {
    it(`scenario ${scenario.scenario}: reproduces transcriptHashHex from RAW wire octets`, () => {
      // Pin 4: hash the raw reassembled wire bytes (wireBase64) — NOT a re-serialised
      // / canonicalised form of the JSON message.
      const hello = b64ToBytes(scenario.hello.wireBase64);
      const challenge = b64ToBytes(scenario.challenge.wireBase64);
      expect(toHex(transcriptHash(hello, challenge))).toBe(scenario.transcript.transcriptHashHex);
    });
  }

  it('bite: a byte flip in the hello wire bytes changes the transcript', () => {
    const full = vector.scenarios.find((s) => s.scenario === 'full')!;
    const hello = b64ToBytes(full.hello.wireBase64);
    const challenge = b64ToBytes(full.challenge.wireBase64);
    expect(toHex(transcriptHash(hello, challenge))).toBe(full.transcript.transcriptHashHex); // sanity
    const mutated = Uint8Array.from(hello);
    mutated[0] ^= 0x01;
    expect(toHex(transcriptHash(mutated, challenge))).not.toBe(full.transcript.transcriptHashHex);
  });
});
