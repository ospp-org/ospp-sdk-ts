import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { SchemaValidator } from '../../src/validation/SchemaValidator';
import { SchemaPath } from '../../src/schemas/SchemaPath';

const BUNDLED_SCHEMAS_ROOT = join(__dirname, '..', '..', 'src', 'schemas');
const TEST_VECTORS_ROOT = join(__dirname, '..', '..', '..', 'spec', 'conformance', 'test-vectors');

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

  for (let len = parts.length; len >= 2; len--) {
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
    if (category === 'offline') continue;

    const categoryDir = join(baseDir, category);
    const files = readdirSync(categoryDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const schemaKey = deriveSchemaKey(file);
      if (schemaKey) {
        vectors.push({
          filePath: join(categoryDir, file),
          fileName: file,
          schemaKey,
          category,
        });
      }
    }
  }

  return vectors;
}

const validVectors = discoverTestVectors(join(TEST_VECTORS_ROOT, 'valid'));
const invalidVectors = discoverTestVectors(join(TEST_VECTORS_ROOT, 'invalid'));

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
