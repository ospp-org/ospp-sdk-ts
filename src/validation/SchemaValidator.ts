/**
 * JSON Schema validation for OSPP messages using Ajv (Draft 2020-12).
 *
 * Source: spec/schemas/mqtt/*.schema.json + spec/schemas/common/*.schema.json.
 *
 * Schemas use $ref with relative paths (e.g. "../common/timestamp.schema.json").
 * We load referenced schemas and register them with Ajv so $ref resolution works.
 */

import Ajv, { type ValidateFunction, type ErrorObject, type AnySchema } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { SchemaPath } from '../schemas/SchemaPath';

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

export class SchemaValidator {
  private readonly ajv: Ajv;
  private readonly schemaPath: SchemaPath;
  private readonly validators = new Map<string, ValidateFunction>();

  constructor(schemasRoot?: string) {
    this.schemaPath = new SchemaPath(schemasRoot);
    // strictRequired: false — spec schemas use allOf/if/then with required
    // properties defined at the top-level properties, not inside then blocks.
    // Ajv strict mode rejects this pattern; the schemas are spec-authored and correct.
    this.ajv = new Ajv({ strict: true, strictRequired: false, allErrors: true });
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
    let validate = this.validators.get(schemaKey);
    if (!validate) {
      const filePath = this.schemaPath.resolve(schemaKey);
      const schema = JSON.parse(readFileSync(filePath, 'utf-8'));

      // Rewrite relative $ref paths to absolute $id URIs so Ajv can resolve them.
      // Remove $id from MQTT schemas to avoid Ajv registration collisions.
      const rewritten = this.rewriteRefs(schema) as Record<string, unknown>;
      delete rewritten.$id;

      validate = this.ajv.compile(rewritten as AnySchema);
      this.validators.set(schemaKey, validate);
    }
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
