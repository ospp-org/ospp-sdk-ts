/**
 * JSON Schema validation for OSPP messages using Ajv (Draft 2020-12).
 *
 * Source: spec/schemas/mqtt/*.schema.json + spec/schemas/common/*.schema.json.
 *
 * Schemas use $ref with relative paths (e.g. "../common/timestamp.schema.json").
 * We load referenced schemas and register them with Ajv so $ref resolution works.
 */

import { Ajv2020, type ValidateFunction, type ErrorObject, type AnySchema } from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SchemaPath } from '../schemas/SchemaPath.js';

// ajv-formats ships CJS without an `exports` map. Under NodeNext ESM the
// default-import binding is the module namespace; the callable plugin sits at
// `.default` in newer Node versions but is the namespace itself when ESM
// interop already unwrapped it. Cast through `any` so both shapes type-check.
type AddFormatsFn = (ajv: Ajv2020) => unknown;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats: AddFormatsFn = ((addFormatsImport as any).default ?? addFormatsImport) as AddFormatsFn;

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

export class SchemaValidator {
  private readonly ajv: Ajv2020;
  private readonly schemaPath: SchemaPath;
  private readonly validators = new Map<string, ValidateFunction>();

  constructor(schemasRoot?: string) {
    this.schemaPath = new SchemaPath(schemasRoot);
    // strictRequired: false — spec schemas use allOf/if/then with required
    // properties defined at the top-level properties, not inside then blocks.
    // Ajv strict mode rejects this pattern; the schemas are spec-authored and correct.
    this.ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
    addFormats(this.ajv);
    this.loadCommonSchemas();
  }

  /**
   * Pre-load all common schemas so $ref resolution works.
   */
  private loadCommonSchemas(): void {
    const commonDir = join(this.schemaPath.root, 'common');
    const files = readdirSync(commonDir).filter((f) => f.endsWith('.schema.json'));
    for (const file of files) {
      const filePath = join(commonDir, file);
      const schema = JSON.parse(readFileSync(filePath, 'utf-8'));
      // Register with the $id from the schema so $ref can find it
      if (schema.$id) {
        if (!this.ajv.getSchema(schema.$id)) {
          this.ajv.addSchema(schema);
        }
      }
    }
  }

  /**
   * Get or compile a validator for the given schema key.
   */
  private getValidator(schemaKey: string): ValidateFunction {
    const cached = this.validators.get(schemaKey);
    if (cached) return cached;

    const filePath = this.schemaPath.resolve(schemaKey);
    const schema = JSON.parse(readFileSync(filePath, 'utf-8'));

    // Rewrite relative $ref paths to absolute $id URIs so Ajv can resolve them.
    // Remove $id from MQTT schemas to avoid Ajv registration collisions.
    const rewritten = this.rewriteRefs(schema) as Record<string, unknown>;
    delete rewritten.$id;

    const validate = this.ajv.compile(rewritten as AnySchema);
    this.validators.set(schemaKey, validate);
    return validate;
  }

  /**
   * Recursively rewrite relative $ref paths to the $id URIs from common schemas.
   */
  private rewriteRefs(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.rewriteRefs(item));

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === '$ref' && typeof value === 'string' && value.startsWith('../common/')) {
        // Convert "../common/timestamp.schema.json" →
        // "https://ospp-standard.org/schemas/v1/common/timestamp.schema.json"
        const fileName = value.replace('../common/', '');
        result[key] = `https://ospp-standard.org/schemas/v1/common/${fileName}`;
      } else {
        result[key] = this.rewriteRefs(value);
      }
    }
    return result;
  }

  /**
   * Validate a payload against a schema identified by key.
   *
   * @param schemaKey  e.g. "boot-notification-request", "start-service-response"
   * @param payload    The JSON payload to validate (not the envelope).
   */
  validate(schemaKey: string, payload: unknown): ValidationResult {
    const validate = this.getValidator(schemaKey);
    const valid = validate(payload);
    return {
      valid: valid as boolean,
      errors: valid ? null : (validate.errors ?? null),
    };
  }

  /** List all known schema keys. */
  get allKeys(): string[] {
    return this.schemaPath.allKeys;
  }
}
