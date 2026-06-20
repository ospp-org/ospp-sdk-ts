import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { p256 } from '@noble/curves/nist.js';
import { hkdf, extract } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { chacha20poly1305 } from '@noble/ciphers/chacha.js';

/**
 * BLE SessionCrypto — RFC anti-circularity anchors (P0 foundation).
 *
 * Proves the @noble primitives the SDK will build SessionCrypto on reproduce the
 * PUBLISHED RFC test vectors byte-for-byte:
 *   - ECDH P-256              RFC 5903 §8.1    (Pin 1: X-only, 32B, left-padded)
 *   - HKDF-SHA256             RFC 5869 A.1/A.2 (Pin 3 key-schedule primitive)
 *   - ChaCha20-Poly1305 IETF  RFC 8439 §2.8.2  (Pin 6 AEAD)
 *
 * Why this exists (the EC-scalar lesson — 06-security.md §6.5 Pin 1): "byte-identical
 * to the spec oracle" only means "correct" if the primitives are independently anchored
 * on an external truth we do not control. Without this gate, sdk-ts and ospp-sdk-php
 * could agree with the spec oracle while all three are wrong the same way.
 *
 * Expected values are loaded from the vendored spec corpus
 * (tests/crypto/fixtures/rfc-primitive-anchors.json — byte-identical to spec
 * conformance/test-vectors/crypto/, enforced by scripts/check-crypto-vectors.sh).
 * The RFC *inputs* are the published constants, mirroring spec tools/ble-crypto.mjs.
 *
 * SCOPE — P0 validates the PRIMITIVES only. The SessionCrypto pipeline (key schedule,
 * transcript, sessionProof, AEAD framing — the 10-function decomposition) is P1.
 */

// --- byte helpers (test runs in Node; the SDK SessionCrypto module in P1 is browser-safe) ---
const H = (hex: string): Buffer => Buffer.from(hex, 'hex');
const seq = (start: number, end: number): Buffer =>
  Buffer.from(Array.from({ length: end - start + 1 }, (_, k) => start + k));
const toHex = (u8: Uint8Array): string => Buffer.from(u8).toString('hex');

// Pin 1 — left-pad a big-endian byte string to exactly 32 bytes, UNCONDITIONALLY
// (06-security.md §6.5 Pin 1; mirrors spec tools/ble-crypto.mjs leftPad32).
function leftPad32(u8: Uint8Array): Buffer {
  if (u8.length > 32) throw new Error(`leftPad32: input ${u8.length} > 32 bytes`);
  const out = Buffer.alloc(32);
  Buffer.from(u8).copy(out, 32 - u8.length);
  return out;
}

// Pin 1 — ECDH P-256 shared secret = X-only, big-endian, 32B, left-padded.
// @noble/curves getSharedSecret returns a 33-byte compressed point (0x02/0x03 ‖ X);
// strip the prefix byte and left-pad the X (tolerant of 32/65-byte returns).
function ecdhSharedX(priv: Uint8Array, peerPub: Uint8Array): Buffer {
  const shared = p256.getSharedSecret(priv, peerPub);
  const x =
    shared.length === 33 ? shared.subarray(1)
    : shared.length === 65 ? shared.subarray(1, 33)
    : shared;
  return leftPad32(x);
}

interface Anchor {
  rfc: string;
  primitive: string;
  sharedSecretX?: string;
  bothDirectionsMatch?: boolean;
  prk?: string;
  okm?: string;
  ciphertext?: string;
  tag?: string;
  roundTrip?: boolean;
}
interface AnchorFile {
  specRef: string;
  sources: Record<string, string>;
  anchors: Anchor[];
}

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, '..', 'fixtures', 'rfc-primitive-anchors.json'), 'utf-8'),
) as AnchorFile;
const byRfc = (rfc: string): Anchor => {
  const a = fixture.anchors.find((x) => x.rfc === rfc);
  if (!a) throw new Error(`anchor not found in vendored corpus: ${rfc}`);
  return a;
};

// --- RFC published inputs (mirror spec tools/ble-crypto.mjs RFC5903/RFC5869/RFC8439) ---
const RFC5903 = {
  i: H('C88F01F510D9AC3F70A292DAA2316DE544E9AAB8AFE84049C62A9C57862D1433'),
  gi: Buffer.concat([
    Buffer.from([0x04]),
    H('DAD0B65394221CF9B051E1FECA5787D098DFE637FC90B9EF945D0C3772581180'),
    H('5271A0461CDB8252D61F1C456FA3E59AB1F45B33ACCF5F58389E0577B8990BB3'),
  ]),
  r: H('C6EF9C5D78AE012A011164ACB397CE2088685D8F06BF9BE0B283AB46476BEE53'),
  gr: Buffer.concat([
    Buffer.from([0x04]),
    H('D12DFB5289C8D4F81208B70270398C342296970A0BCCB74C736FC7554494BF63'),
    H('56FBF3CA366CC23E8157854C13C58D6AAC23F046ADA30F8353E74F33039872AB'),
  ]),
};
const RFC5869 = {
  a1: { ikm: H('0b'.repeat(22)), salt: H('000102030405060708090a0b0c'), info: H('f0f1f2f3f4f5f6f7f8f9'), L: 42 },
  a2: { ikm: seq(0x00, 0x4f), salt: seq(0x60, 0xaf), info: seq(0xb0, 0xff), L: 82 },
};
const RFC8439 = {
  key: seq(0x80, 0x9f),
  nonce: H('070000004041424344454647'),
  aad: H('50515253c0c1c2c3c4c5c6c7'),
  plaintext: Buffer.from(
    "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.",
    'utf-8',
  ),
};

describe('BLE SessionCrypto primitives — RFC anti-circularity anchors (vendored corpus)', () => {
  it('vendored corpus is the v0.6.0 BLE crypto anchors', () => {
    expect(fixture.specRef).toBe('v0.6.0');
    expect(fixture.anchors.length).toBe(4);
  });

  describe('Pin 1 — leftPad32 (unconditional 32-byte width)', () => {
    it('is a no-op on a full-width 32-byte input', () => {
      expect(toHex(leftPad32(H('ff'.repeat(32))))).toBe('ff'.repeat(32));
    });
    it('left-pads a short (zero-high-byte) input — the ~1/256 EC-scalar case', () => {
      const padded = leftPad32(H('ab'.repeat(31))); // 31-byte big-endian value
      expect(padded.length).toBe(32);
      expect(padded[0]).toBe(0x00);
      expect(toHex(padded)).toBe('00' + 'ab'.repeat(31));
    });
  });

  describe('ECDH P-256 — RFC 5903 §8.1', () => {
    it('reproduces the shared X in both directions (Pin 1)', () => {
      const a = byRfc('RFC 5903 §8.1');
      const xIR = ecdhSharedX(RFC5903.i, RFC5903.gr); // ECDH(i, gr)
      const xRI = ecdhSharedX(RFC5903.r, RFC5903.gi); // ECDH(r, gi)
      expect(toHex(xIR)).toBe(a.sharedSecretX!);
      expect(toHex(xRI)).toBe(a.sharedSecretX!);
    });
  });

  describe('HKDF-SHA256 — RFC 5869', () => {
    it('A.1 reproduces PRK + OKM', () => {
      const a = byRfc('RFC 5869 A.1');
      expect(toHex(extract(sha256, RFC5869.a1.ikm, RFC5869.a1.salt))).toBe(a.prk!);
      expect(toHex(hkdf(sha256, RFC5869.a1.ikm, RFC5869.a1.salt, RFC5869.a1.info, RFC5869.a1.L))).toBe(a.okm!);
    });
    it('A.2 reproduces PRK + OKM (long inputs)', () => {
      const a = byRfc('RFC 5869 A.2');
      expect(toHex(extract(sha256, RFC5869.a2.ikm, RFC5869.a2.salt))).toBe(a.prk!);
      expect(toHex(hkdf(sha256, RFC5869.a2.ikm, RFC5869.a2.salt, RFC5869.a2.info, RFC5869.a2.L))).toBe(a.okm!);
    });
  });

  describe('ChaCha20-Poly1305 IETF — RFC 8439 §2.8.2', () => {
    it('reproduces ciphertext + tag and round-trips (Pin 6)', () => {
      const a = byRfc('RFC 8439 §2.8.2');
      const sealed = Buffer.from(
        chacha20poly1305(RFC8439.key, RFC8439.nonce, RFC8439.aad).encrypt(RFC8439.plaintext),
      );
      const ct = sealed.subarray(0, sealed.length - 16);
      const tag = sealed.subarray(sealed.length - 16);
      expect(toHex(ct)).toBe(a.ciphertext!);
      expect(toHex(tag)).toBe(a.tag!);
      const opened = Buffer.from(
        chacha20poly1305(RFC8439.key, RFC8439.nonce, RFC8439.aad).decrypt(sealed),
      );
      expect(opened.equals(RFC8439.plaintext)).toBe(true);
    });
  });
});
