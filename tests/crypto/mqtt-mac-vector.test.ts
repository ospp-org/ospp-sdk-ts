/**
 * Envelope-MAC conformance against the spec's own vector (§5.4), sdk-ts side.
 *
 * `fixtures/mqtt-mac.json` is VENDORED BYTE-IDENTICALLY from
 * `conformance/test-vectors/crypto/mqtt-mac.json` at the ref in `.spec-ref`,
 * enforced by `npm run check:crypto-vectors`.
 *
 * WHY THIS TEST EXISTS AT ALL, and it is not "one more vector". Until 2026-09-09
 * neither SDK vendored this file — the spec carried five crypto vectors and both
 * SDKs carried four — while both gates printed "OK — vendored crypto corpus
 * byte-identical" on every run. This repo's gate was four hardcoded `check`
 * lines, so a spec vector nobody had copied was a vector nobody compared.
 * Vendoring it without consuming it would repeat the mistake one layer up: a
 * file nothing reads is a file whose corruption nothing reports.
 *
 * The vector pins ONE thing the formula did not say in words until spec 0.13.0:
 * the HMAC key is the DECODED 32 bytes of `sessionKey`, not the 44-character
 * Base64 text that carries it on the wire. A reader following the formula
 * literally produces `macIfKeyNotDecoded` and fails against every conforming
 * peer — silently, because the messages that carry a MAC most often are EVENTs,
 * which are refused with no reply at all.
 *
 * This is the same vector ospp-sdk-php now asserts in
 * `tests/Contract/Crypto/MqttMacVectorTest.php`. The two SDKs agree because both
 * are compared to one upstream, not because a comment says they do.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHmac, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { canonicalizeForMac } from '../../src/crypto/CanonicalJsonSerializer';
import { computeMac, verifyMac } from '../../src/crypto/HmacSigner';

interface MqttMacVector {
  key: {
    derivation: string;
    hex: string;
    sessionKeyBase64: string;
    decodedLengthBytes: number;
    base64TextLengthChars: number;
  };
  message: Record<string, unknown>;
  canonicalJson: string;
  canonicalLengthBytes: number;
  mac: string;
  macIfKeyNotDecoded: { value: string };
}

const here = dirname(fileURLToPath(import.meta.url));
const vector = JSON.parse(
  readFileSync(join(here, 'fixtures', 'mqtt-mac.json'), 'utf-8'),
) as MqttMacVector;

describe('mqtt envelope MAC — spec vector §5.4', () => {
  it('canonicalises to the bytes the vector pins', () => {
    const canonical = canonicalizeForMac(vector.message);
    expect(canonical).toBe(vector.canonicalJson);
    // Carried separately in the vector and the cheapest discriminator an
    // integrator can check first: a length mismatch is canonicalization, a
    // length match with a MAC mismatch is the key.
    expect(Buffer.byteLength(canonical, 'utf-8')).toBe(vector.canonicalLengthBytes);
  });

  it('computes the MAC the spec computed', () => {
    expect(computeMac(vector.key.sessionKeyBase64, vector.message)).toBe(vector.mac);
  });

  it('reproduces the key from its own recorded derivation', () => {
    const { sessionKeyBase64, hex, decodedLengthBytes, base64TextLengthChars } = vector.key;
    expect(sessionKeyBase64).toHaveLength(base64TextLengthChars);

    const raw = Buffer.from(sessionKeyBase64, 'base64');
    expect(raw).toHaveLength(decodedLengthBytes);
    expect(raw.toString('hex')).toBe(hex);
    expect(createHash('sha256').update('OSPP MQTT MAC test vector v1').digest('hex')).toBe(hex);
  });

  it('does NOT accept the Base64 text as the HMAC key', () => {
    // The literal reading of the pre-0.13.0 formula: pass the 44-character text.
    const literalReading = createHmac('sha256', vector.key.sessionKeyBase64)
      .update(vector.canonicalJson, 'utf-8')
      .digest('base64');

    expect(literalReading).toBe(vector.macIfKeyNotDecoded.value);
    // Both halves asserted: equality alone would pass if the two values were
    // somehow the same string, which would leave the vector no discriminating
    // power at all.
    expect(literalReading).not.toBe(vector.mac);
  });

  it('verifies the vector MAC and refuses a tampered envelope', () => {
    const signed = { ...vector.message, mac: vector.mac };
    expect(verifyMac(vector.key.sessionKeyBase64, signed)).toBe(true);

    // One field changed, same MAC. §5.5 step 5: reject.
    const tampered = { ...signed, timestamp: '2000-01-01T00:00:00.000Z' };
    expect(verifyMac(vector.key.sessionKeyBase64, tampered)).toBe(false);
  });
});
