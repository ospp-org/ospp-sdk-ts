import { describe, it, expect } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { sign, verify, SIGNATURE_ALGORITHM } from '../../src/crypto/EcdsaSigner';

// Generate a P-256 keypair for testing
const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const SAMPLE_DATA = '{"sessionId":"sess_a1b2c3d4","credits":50,"txCounter":1}';

describe('SIGNATURE_ALGORITHM', () => {
  it('should be ECDSA-P256-SHA256', () => {
    expect(SIGNATURE_ALGORITHM).toBe('ECDSA-P256-SHA256');
  });
});

describe('sign', () => {
  it('should return a base64 string', () => {
    const sig = sign(privateKey, SAMPLE_DATA);
    expect(sig).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should produce a DER-encoded signature', () => {
    const sig = sign(privateKey, SAMPLE_DATA);
    const bytes = Buffer.from(sig, 'base64');
    // DER ECDSA P-256 signatures are 70-72 bytes (SEQUENCE of two INTEGERs)
    expect(bytes.length).toBeGreaterThanOrEqual(68);
    expect(bytes.length).toBeLessThanOrEqual(72);
    // DER SEQUENCE tag
    expect(bytes[0]).toBe(0x30);
  });

  it('should accept string input', () => {
    const sig = sign(privateKey, 'hello world');
    expect(typeof sig).toBe('string');
  });

  it('should accept Buffer input', () => {
    const sig = sign(privateKey, Buffer.from('hello world'));
    expect(typeof sig).toBe('string');
  });

  it('should produce valid signatures on repeated calls', () => {
    // Note: Node.js uses random nonces, not RFC 6979.
    // RFC 6979 deterministic nonces are a spec requirement for station firmware
    // (secure elements), not enforceable at the Node.js crypto API level.
    const sig1 = sign(privateKey, SAMPLE_DATA);
    const sig2 = sign(privateKey, SAMPLE_DATA);
    // Both must verify, even if different (random nonce)
    expect(verify(publicKey, SAMPLE_DATA, sig1)).toBe(true);
    expect(verify(publicKey, SAMPLE_DATA, sig2)).toBe(true);
  });
});

describe('verify', () => {
  it('should return true for valid signature', () => {
    const sig = sign(privateKey, SAMPLE_DATA);
    expect(verify(publicKey, SAMPLE_DATA, sig)).toBe(true);
  });

  it('should return false for tampered data', () => {
    const sig = sign(privateKey, SAMPLE_DATA);
    expect(verify(publicKey, SAMPLE_DATA + 'x', sig)).toBe(false);
  });

  it('should return false for wrong public key', () => {
    const other = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const sig = sign(privateKey, SAMPLE_DATA);
    expect(verify(other.publicKey, SAMPLE_DATA, sig)).toBe(false);
  });

  it('should return false for corrupted signature', () => {
    const sig = sign(privateKey, SAMPLE_DATA);
    const corrupted = sig.slice(0, -4) + 'XXXX';
    expect(verify(publicKey, SAMPLE_DATA, corrupted)).toBe(false);
  });

  it('should work with Buffer data', () => {
    const data = Buffer.from(SAMPLE_DATA);
    const sig = sign(privateKey, data);
    expect(verify(publicKey, data, sig)).toBe(true);
  });
});

describe('sign + verify roundtrip', () => {
  it('should roundtrip with receipt-like data', () => {
    const receiptData = JSON.stringify({
      sessionId: 'sess_a1b2c3d4',
      bayId: 'bay_c1d2e3f4a5b6',
      serviceId: 'svc_eco',
      creditsCharged: 50,
      durationSeconds: 300,
      txCounter: 42,
    });

    const sig = sign(privateKey, receiptData);
    expect(verify(publicKey, receiptData, sig)).toBe(true);
  });

  it('should roundtrip with empty data', () => {
    const sig = sign(privateKey, '');
    expect(verify(publicKey, '', sig)).toBe(true);
  });
});
