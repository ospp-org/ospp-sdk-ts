import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createPublicKey } from 'node:crypto'; // test-only: convert the vendored server PEM → raw point
import {
  validatePublicKey,
  ecdhSharedX,
  leftPad32,
  transcriptHash,
  deriveSessionKeys,
  sessionProof,
  nonce96,
  sealFrame,
  openFrame,
  verifyStationIdentity,
  StationIdentityError,
  type StationIdentityCert,
} from '../../../src/crypto/ble/SessionCrypto';

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
  sessionProof: { passId: string; counter: number; sessionProofBase64: string; messageHex: string };
  aeadFrames: Array<{
    direction: string;
    keyRef: string;
    counter: number;
    nonce96Hex: string;
    plaintextUtf8: string;
    frame: { n: number; ct: string };
  }>;
}
interface Vector {
  specRef: string;
  keys: Record<string, KeyEntry>;
  scenarios: Scenario[];
  stationIdentity: { cert: StationIdentityCert; canonicalBodyUtf8: string };
}

const here = dirname(fileURLToPath(import.meta.url));
const vector = JSON.parse(
  readFileSync(join(here, '..', 'fixtures', 'ble-handshake-keyschedule.json'), 'utf-8'),
) as Vector;
const keys = vector.keys;

// Server signing public key as raw uncompressed SEC1 — converted from the vendored
// PEM in Node FOR THE TEST; the SDK verifyStationIdentity takes raw bytes (browser-safe).
const serverPubPem = readFileSync(join(here, '..', 'fixtures', 'server-test-pub.pem'), 'utf-8');
const _jwk = createPublicKey(serverPubPem).export({ format: 'jwk' }) as { x: string; y: string };
const _b64u = (s: string): Uint8Array => Uint8Array.from(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
const serverPubRaw = new Uint8Array([0x04, ..._b64u(_jwk.x), ..._b64u(_jwk.y)]);

const b64ToBytes = (b: string): Uint8Array => Uint8Array.from(Buffer.from(b, 'base64'));
const hexToBytes = (h: string): Uint8Array => Uint8Array.from(Buffer.from(h, 'hex'));
const toHex = (u8: Uint8Array): string => Buffer.from(u8).toString('hex');
const toBase64 = (u8: Uint8Array): string => Buffer.from(u8).toString('base64');
const utf8 = (s: string): Uint8Array => Uint8Array.from(Buffer.from(s, 'utf-8'));

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

describe('SessionCrypto.deriveSessionKeys (Pin 3 / §6.5)', () => {
  const build = (s: Scenario) => ({
    es: hexToBytes(s.ecdh.esHex),
    ee: hexToBytes(s.ecdh.eeHex),
    appNonce: b64ToBytes(s.hello.message.appNonce),
    stationNonce: b64ToBytes(s.challenge.message.stationNonce),
    deviceId: s.hello.message.deviceId,
    transcriptHash: hexToBytes(s.transcript.transcriptHashHex),
  });

  for (const scenario of vector.scenarios) {
    describe(`scenario ${scenario.scenario}`, () => {
      it('SessionKey reproduces sessionKeyHex', () => {
        expect(toHex(deriveSessionKeys(build(scenario)).sessionKey)).toBe(scenario.keySchedule.sessionKeyHex);
      });
      it('directional keys reproduce kAppToStationHex / kStationToAppHex', () => {
        const k = deriveSessionKeys(build(scenario));
        expect(toHex(k.kAppToStation)).toBe(scenario.keySchedule.kAppToStationHex);
        expect(toHex(k.kStationToApp)).toBe(scenario.keySchedule.kStationToAppHex);
      });
      it('sessionKeyConfirmation reproduces sessionKeyConfirmationBase64', () => {
        expect(toBase64(deriveSessionKeys(build(scenario)).sessionKeyConfirmation)).toBe(
          scenario.keySchedule.sessionKeyConfirmationBase64,
        );
      });
    });
  }

  it('bite: a mutated es yields a different SessionKey AND different directional keys', () => {
    const full = vector.scenarios.find((s) => s.scenario === 'full')!;
    const params = build(full);
    expect(toHex(deriveSessionKeys(params).sessionKey)).toBe(full.keySchedule.sessionKeyHex); // sanity
    const mutatedEs = Uint8Array.from(params.es);
    mutatedEs[0] ^= 0x01;
    const k = deriveSessionKeys({ ...params, es: mutatedEs });
    expect(toHex(k.sessionKey)).not.toBe(full.keySchedule.sessionKeyHex);
    expect(toHex(k.kAppToStation)).not.toBe(full.keySchedule.kAppToStationHex);
  });

  it('bite: a mutated deviceId (Pin 3 info binding, injective LP) yields a different SessionKey', () => {
    const full = vector.scenarios.find((s) => s.scenario === 'full')!;
    const params = build(full);
    expect(toHex(deriveSessionKeys({ ...params, deviceId: params.deviceId + 'x' }).sessionKey)).not.toBe(
      full.keySchedule.sessionKeyHex,
    );
  });
});

describe('SessionCrypto.sessionProof (§6.5.1 / ble-handshake §4.1)', () => {
  for (const scenario of vector.scenarios) {
    it(`scenario ${scenario.scenario}: reproduces sessionProofBase64`, () => {
      // Reproduction proves decimal(counter) = String(counter) ASCII (NOT U64BE):
      // a U64BE counter encoding would not match this Base64.
      const sk = hexToBytes(scenario.keySchedule.sessionKeyHex);
      const { passId, counter } = scenario.sessionProof;
      expect(toBase64(sessionProof(sk, passId, counter))).toBe(scenario.sessionProof.sessionProofBase64);
    });
  }

  it('bite: a mutated counter or passId changes the proof', () => {
    const full = vector.scenarios.find((s) => s.scenario === 'full')!;
    const sk = hexToBytes(full.keySchedule.sessionKeyHex);
    const { passId, counter, sessionProofBase64 } = full.sessionProof;
    expect(toBase64(sessionProof(sk, passId, counter))).toBe(sessionProofBase64); // sanity
    expect(toBase64(sessionProof(sk, passId, counter + 1))).not.toBe(sessionProofBase64);
    expect(toBase64(sessionProof(sk, `${passId}x`, counter))).not.toBe(sessionProofBase64);
  });
});

describe('SessionCrypto.nonce96 (Pin 5 / §6.5.3)', () => {
  for (const scenario of vector.scenarios) {
    for (const frame of scenario.aeadFrames) {
      it(`${scenario.scenario}/${frame.direction}: nonce96(${frame.counter}) reproduces nonce96Hex`, () => {
        expect(toHex(nonce96(frame.counter))).toBe(frame.nonce96Hex);
      });
    }
  }

  it('is 12 bytes = 0x00000000 ‖ U64BE(counter)', () => {
    const n = nonce96(1);
    expect(n.length).toBe(12);
    expect(toHex(n)).toBe('000000000000000000000001');
    expect(toHex(nonce96(258))).toBe('000000000000000000000102'); // 0x102 in the low bytes
  });

  it('bite: a different counter yields a different nonce', () => {
    expect(toHex(nonce96(5))).not.toBe(toHex(nonce96(6)));
  });
});

describe('SessionCrypto.sealFrame / openFrame (Pin 6+7 / §6.5.3)', () => {
  const keyOf = (s: Scenario, keyRef: string): Uint8Array =>
    hexToBytes(keyRef === 'kAppToStation' ? s.keySchedule.kAppToStationHex : s.keySchedule.kStationToAppHex);

  for (const scenario of vector.scenarios) {
    const aad = hexToBytes(scenario.transcript.transcriptHashHex); // Pin 7: AAD = transcriptHash
    for (const frame of scenario.aeadFrames) {
      const key = keyOf(scenario, frame.keyRef);
      const plaintext = utf8(frame.plaintextUtf8);
      it(`${scenario.scenario}/${frame.direction}: sealFrame reproduces frame.ct (Pin 6)`, () => {
        expect(toBase64(sealFrame(key, frame.counter, plaintext, aad))).toBe(frame.frame.ct);
      });
      it(`${scenario.scenario}/${frame.direction}: openFrame round-trips`, () => {
        const sealed = sealFrame(key, frame.counter, plaintext, aad);
        expect(toHex(openFrame(key, frame.counter, sealed, aad))).toBe(toHex(plaintext));
      });
    }
  }

  const full = vector.scenarios.find((s) => s.scenario === 'full')!;
  const fFrame = full.aeadFrames[0];
  const fKey = keyOf(full, fFrame.keyRef);
  const fAad = hexToBytes(full.transcript.transcriptHashHex);

  it('AAD = transcriptHash binds the frame: a wrong AAD makes openFrame throw (Pin 7)', () => {
    const sealed = sealFrame(fKey, fFrame.counter, utf8(fFrame.plaintextUtf8), fAad);
    expect(() => openFrame(fKey, fFrame.counter, sealed, new Uint8Array(32))).toThrow();
  });

  it('openFrame rejects a tampered tag (AEAD integrity)', () => {
    const sealed = sealFrame(fKey, fFrame.counter, utf8(fFrame.plaintextUtf8), fAad);
    const tampered = Uint8Array.from(sealed);
    tampered[tampered.length - 1] ^= 0x01;
    expect(() => openFrame(fKey, fFrame.counter, tampered, fAad)).toThrow();
  });

  it('bite: a mutated plaintext yields a different ct', () => {
    const pt = utf8(fFrame.plaintextUtf8);
    expect(toBase64(sealFrame(fKey, fFrame.counter, pt, fAad))).toBe(fFrame.frame.ct); // sanity
    const mutated = Uint8Array.from(pt);
    mutated[0] ^= 0x01;
    expect(toBase64(sealFrame(fKey, fFrame.counter, mutated, fAad))).not.toBe(fFrame.frame.ct);
  });
});

describe('SessionCrypto.verifyStationIdentity (§6.5.2 / Pin 8)', () => {
  const validCert = (): StationIdentityCert => ({ ...vector.stationIdentity.cert });

  it('accepts a valid StationIdentity cert under the server public key', () => {
    expect(() => verifyStationIdentity(validCert(), serverPubRaw)).not.toThrow();
  });

  it('accepts the optional stationId match when it agrees', () => {
    const cert = validCert();
    expect(() => verifyStationIdentity(cert, serverPubRaw, { expectedStationId: cert.stationId })).not.toThrow();
  });

  it('rejects under a valid-but-wrong public key (signature does not verify)', () => {
    const wrong = hexToBytes(keys.stationStatic.publicKeyUncompressedHex); // a valid P-256 point, not the signer
    expect(() => verifyStationIdentity(validCert(), wrong)).toThrow();
  });

  it('rejects a wrong signatureAlgorithm', () => {
    expect(() => verifyStationIdentity({ ...validCert(), signatureAlgorithm: 'ECDSA-P384-SHA384' }, serverPubRaw)).toThrow();
  });

  it('rejects a malformed stationPubKey (Pin 2: not 44-char compressed-SEC1 Base64)', () => {
    expect(() => verifyStationIdentity({ ...validCert(), stationPubKey: 'too-short' }, serverPubRaw)).toThrow();
  });

  it('rejects a structurally invalid validity window (expiresAt <= issuedAt)', () => {
    const cert = validCert();
    expect(() => verifyStationIdentity({ ...cert, expiresAt: cert.issuedAt }, serverPubRaw)).toThrow();
  });

  it('rejects a tampered signature', () => {
    const cert = validCert();
    const sig = Buffer.from(cert.signature, 'base64');
    sig[sig.length - 1] ^= 0x01;
    expect(() => verifyStationIdentity({ ...cert, signature: sig.toString('base64') }, serverPubRaw)).toThrow();
  });

  it('rejects an expectedStationId mismatch', () => {
    expect(() => verifyStationIdentity(validCert(), serverPubRaw, { expectedStationId: 'stn_wrong' })).toThrow();
  });

  it('absolute freshness is a RUNTIME gate: rejects an expired cert only when a clock is supplied', () => {
    // The vector cert is timeless; supply a clock past expiresAt to exercise the runtime gate
    // (the vector itself cannot prove absolute freshness — that lands at B5 with a real clock).
    const cert = validCert();
    expect(() => verifyStationIdentity(cert, serverPubRaw, { now: Date.parse(cert.expiresAt) + 1 })).toThrow();
    expect(() => verifyStationIdentity(cert, serverPubRaw, { now: Date.parse(cert.issuedAt) + 1000 })).not.toThrow();
  });

  it('throws StationIdentityError with code 2013 BLE_AUTH_FAILED on failure (§6.5.2)', () => {
    try {
      verifyStationIdentity({ ...validCert(), signatureAlgorithm: 'X' }, serverPubRaw);
      throw new Error('expected verifyStationIdentity to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(StationIdentityError);
      expect((e as StationIdentityError).code).toBe(2013);
    }
  });

  it('bite: a one-byte change in the signed body (stationId) fails verification', () => {
    const cert = validCert();
    expect(() => verifyStationIdentity({ ...cert, stationId: `${cert.stationId}x` }, serverPubRaw)).toThrow();
  });
});
