import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { SchemaValidator } from '../../src/validation/SchemaValidator';
import { SchemaPath } from '../../src/schemas/SchemaPath';

const BUNDLED_SCHEMAS_ROOT = join(__dirname, '..', '..', 'src', 'schemas');
const TEST_VECTORS_ROOT = join(__dirname, '..', '..', 'src', 'test-vectors');

// Use SchemaPath at module level just for key lookup (no Ajv needed)
const ALL_KEYS = new SchemaPath(BUNDLED_SCHEMAS_ROOT).allKeys;

let validator: SchemaValidator;

beforeAll(() => {
  // Use bundled schemas (src/schemas/), not the external spec repo
  validator = new SchemaValidator(BUNDLED_SCHEMAS_ROOT);
});

// ---------------------------------------------------------------------------
// Map test vector filenames to schema keys
// ---------------------------------------------------------------------------

function deriveSchemaKey(fileName: string): string | undefined {
  const name = fileName.replace(/\.json$/, '');
  const parts = name.split('-');

  // Down to ONE part: `hello`, `receipt` and `challenge` are single-word schema
  // names, and a loop that stops at two never reaches them.
  for (let len = parts.length; len >= 1; len--) {
    const candidate = parts.slice(0, len).join('-');
    if (ALL_KEYS.includes(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Discover test vectors dynamically
// ---------------------------------------------------------------------------

interface TestVector {
  filePath: string;
  fileName: string;
  schemaKey: string;
  category: string;
}

/** Vectors that resolved to no schema key. Never silently dropped. */
const unmapped: string[] = [];

function discoverTestVectors(baseDir: string): TestVector[] {
  const vectors: TestVector[] = [];

  let categories: string[];
  try {
    categories = readdirSync(baseDir).filter((d) => {
      try {
        return readdirSync(join(baseDir, d)).length > 0;
      } catch {
        return false;
      }
    });
  } catch {
    return vectors;
  }

  for (const category of categories) {
    // `offline` is the BLE corpus. SchemaPath maps only MQTT keys, so those
    // vectors have nowhere to resolve to and are recorded as unmapped rather
    // than dropped -- see the coverage assertion below. Skipping them silently
    // is how 306 vendored vectors read as full coverage while 61 never ran.
    const categoryDir = join(baseDir, category);
    const files = readdirSync(categoryDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const schemaKey = category === 'offline' ? undefined : deriveSchemaKey(file);
      if (schemaKey) {
        vectors.push({
          filePath: join(categoryDir, file),
          fileName: file,
          schemaKey,
          category,
        });
      } else {
        unmapped.push(`${category}/${file}`);
      }
    }
  }

  return vectors;
}

const validVectors = discoverTestVectors(join(TEST_VECTORS_ROOT, 'valid'));
const invalidVectors = discoverTestVectors(join(TEST_VECTORS_ROOT, 'invalid'));

describe('vector coverage', () => {
  it('vendors the whole corpus', () => {
    // 163 valid + 166 invalid = 329, the count the spec's own verify-schemas.py
    // reports at v0.23.0. It was 318 at v0.22.0; the eleven added are the
    // diagnostics conditionals (four negatives arming `progress` and `errorText`),
    // the three that enter the `if`/`then` branches of get-diagnostics-response and
    // set-maintenance-mode-response which NO vector had ever entered, the
    // get-diagnostics-request-http-url mirror of the firmware negative, and three
    // positives for the Failed, Uploaded and Rejected shapes that had none.
    // A truncated vendored copy would make every test below pass vacuously.
    //
    // This literal is a SECOND COPY of a fact about the corpus, not a check on
    // it: nothing derives it from the vendored tree, so it must be hand-bumped
    // on every new vector. See KNOWN-ISSUES — the gate that should replace it
    // derives the count at run time and asserts only `> 0`, leaving byte-identity
    // against the spec clone to pin WHICH vectors are present.
    expect(validVectors.length + invalidVectors.length + unmapped.length).toBe(329);
  });

  it('leaves exactly the BLE corpus unmapped, and names it', () => {
    // SchemaPath maps MQTT keys only, so the BLE `offline` vectors resolve to
    // nothing here. ospp-sdk-php DOES validate them, against schemas/ble/*.
    // Naming them is the point: the previous `if (schemaKey)` dropped 61
    // vectors without a word, so coverage read as complete when it was not.
    expect(unmapped.every((v) => v.startsWith('offline/'))).toBe(true);
    expect(unmapped.length).toBe(61);
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SchemaValidator', () => {
  it('should have validators for all 47 schema keys', () => {
    expect(validator.allKeys.length).toBe(47);
  });

  it('should validate a simple valid payload', () => {
    const result = validator.validate('heartbeat-request', {});
    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it('should reject a simple invalid payload', () => {
    const result = validator.validate('heartbeat-response', {});
    expect(result.valid).toBe(false);
    expect(result.errors).not.toBeNull();
  });
});

describe(`Conformance test vectors — valid (${validVectors.length} vectors)`, () => {
  it('should have discovered valid test vectors', () => {
    expect(validVectors.length).toBeGreaterThan(50);
  });

  for (const tv of validVectors) {
    it(`[${tv.category}] ${tv.fileName} → ${tv.schemaKey}`, () => {
      const payload = JSON.parse(readFileSync(tv.filePath, 'utf-8'));
      const result = validator.validate(tv.schemaKey, payload);
      if (!result.valid) {
        const errorDetails = result.errors?.map((e) => `${e.instancePath} ${e.message}`).join('; ');
        expect.fail(`Expected valid but got errors: ${errorDetails}`);
      }
    });
  }
});

describe(`Conformance test vectors — invalid (${invalidVectors.length} vectors)`, () => {
  it('should have discovered invalid test vectors', () => {
    expect(invalidVectors.length).toBeGreaterThan(50);
  });

  for (const tv of invalidVectors) {
    it(`[${tv.category}] ${tv.fileName} → ${tv.schemaKey}`, () => {
      const payload = JSON.parse(readFileSync(tv.filePath, 'utf-8'));
      const result = validator.validate(tv.schemaKey, payload);
      expect(result.valid).toBe(false);
    });
  }
});
