import { describe, it, expect } from 'vitest';
import {
  MAX_ENVELOPE_BYTES,
  MQTT_MAX_PACKET_BYTES,
  envelopeByteLength,
  exceedsEnvelopeCap,
  remainingEnvelopeBytes,
  assertWithinEnvelopeCap,
  serializeEnvelopeForWire,
  createEnvelope,
} from '../../src/index.js';
import { MessageType } from '../../src/enums/MessageType.js';
import { MessageSource } from '../../src/enums/MessageSource.js';
import { OsppAction } from '../../src/actions/OsppAction.js';

/**
 * The envelope cap — spec/02-transport.md §10.2.1.
 *
 * Every assertion is BOUNDARY-EXACT and tested from both sides. A cap tested only with
 * a value far over it proves the comparison fires, not that it fires in the right
 * place, and an off-by-one here is invisible in every real frame: the largest envelope
 * ever measured on a live deployment is 1 220 bytes, so nothing in normal operation
 * would reach the edge to disagree with it.
 */
describe('envelope cap', () => {
  const envelopeWithPayloadOfSize = (filler: number) =>
    createEnvelope({
      messageId: 'b0edf290-9bf5-421e-bfc7-417c68f38d2f',
      messageType: MessageType.REQUEST,
      action: OsppAction.UPDATE_SERVICE_CATALOG,
      source: MessageSource.SERVER,
      timestamp: '2026-09-10T00:00:00.000Z',
      payload: { blob: 'a'.repeat(filler) },
    });

  it('is the number the specification states', () => {
    expect(MAX_ENVELOPE_BYTES).toBe(64512);
    expect(MQTT_MAX_PACKET_BYTES).toBe(65536);
  });

  it('sits 1024 bytes inside the packet ceiling', () => {
    // Not arithmetic for its own sake: the gap IS the PUBLISH header allowance, and a
    // change to either constant that closes it makes a conformant envelope
    // undeliverable at a size this SDK told the caller was legal.
    expect(MQTT_MAX_PACKET_BYTES - MAX_ENVELOPE_BYTES).toBe(1024);
  });

  it('is false at the cap and true one byte over', () => {
    const atCap = 'x'.repeat(MAX_ENVELOPE_BYTES);
    expect(exceedsEnvelopeCap(atCap)).toBe(false);
    expect(exceedsEnvelopeCap(atCap + 'x')).toBe(true);
    expect(remainingEnvelopeBytes(atCap)).toBe(0);
    expect(remainingEnvelopeBytes(atCap + 'x')).toBe(-1);
  });

  it('counts UTF-8 bytes and not UTF-16 code units', () => {
    // `'é'.length` is 1 and it costs 2 bytes; an astral character counts 2 in JS and
    // costs 4. Measuring with String.length would let a UTF-8 envelope pass here and
    // be dropped by the broker, which measures the packet.
    expect(envelopeByteLength('é')).toBe(2);
    expect(envelopeByteLength('😀')).toBe(4);
    expect('😀'.length).toBe(2);

    const twoByte = 'é'.repeat(MAX_ENVELOPE_BYTES);
    expect(envelopeByteLength(twoByte)).toBe(2 * MAX_ENVELOPE_BYTES);
    expect(exceedsEnvelopeCap(twoByte)).toBe(true);
  });

  it('accepts a Uint8Array as well as a string, so a receiver can check raw bytes', () => {
    // The receiver half runs before parsing, where the frame is still bytes.
    const raw = new TextEncoder().encode('x'.repeat(MAX_ENVELOPE_BYTES + 1));
    expect(exceedsEnvelopeCap(raw)).toBe(true);
    expect(exceedsEnvelopeCap(raw.subarray(0, MAX_ENVELOPE_BYTES))).toBe(false);
  });

  it('asserts without throwing exactly at the cap', () => {
    expect(() => assertWithinEnvelopeCap('x'.repeat(MAX_ENVELOPE_BYTES))).not.toThrow();
  });

  it('throws one byte over and names the action', () => {
    expect(() =>
      assertWithinEnvelopeCap('x'.repeat(MAX_ENVELOPE_BYTES + 1), 'UpdateServiceCatalog'),
    ).toThrow(/UpdateServiceCatalog envelope is 64513 bytes/);
  });

  it('serialises an envelope that lands exactly on the cap', () => {
    const overhead = serializeEnvelopeForWire(envelopeWithPayloadOfSize(1)).length - 1;
    const atCap = envelopeWithPayloadOfSize(MAX_ENVELOPE_BYTES - overhead);

    expect(envelopeByteLength(serializeEnvelopeForWire(atCap))).toBe(MAX_ENVELOPE_BYTES);
  });

  it('refuses an envelope one byte over the cap', () => {
    const overhead = serializeEnvelopeForWire(envelopeWithPayloadOfSize(1)).length - 1;
    const overCap = envelopeWithPayloadOfSize(MAX_ENVELOPE_BYTES - overhead + 1);

    expect(() => serializeEnvelopeForWire(overCap)).toThrow(RangeError);
  });

  it('leaves a realistic frame nowhere near the cap', () => {
    // The measurement the cap was chosen against: the largest envelope observed on a
    // live deployment is 1 220 bytes. If this fails, the cap is no longer the generous
    // number it was derived to be and §10.2.1's derivation needs re-running.
    const wire = serializeEnvelopeForWire(envelopeWithPayloadOfSize(64));
    expect(envelopeByteLength(wire)).toBeLessThan(2048);
    expect(remainingEnvelopeBytes(wire)).toBeGreaterThan(60000);
  });
});
