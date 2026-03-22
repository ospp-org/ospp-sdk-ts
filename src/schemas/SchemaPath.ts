/**
 * Resolves file-system paths to OSPP JSON Schema files.
 *
 * Schemas live in the spec repo under schemas/mqtt/ and schemas/common/.
 * This module maps action names + message types to schema file paths.
 */

import { join } from 'path';

/** Bundled schemas root — relative to compiled dist/schemas/ directory. */
const DEFAULT_SCHEMAS_ROOT = join(__dirname, '..', 'schemas');

/**
 * Maps a schema key (derived from file name) to its path under schemas/mqtt/.
 *
 * Key format: `{kebab-action}-{request|response|event}.schema.json`
 * Example:    `boot-notification-request` → `mqtt/boot-notification-request.schema.json`
 */

const ACTION_TO_SCHEMA_FILE: Record<string, string> = {
  // Provisioning
  'boot-notification-request': 'mqtt/boot-notification-request.schema.json',
  'boot-notification-response': 'mqtt/boot-notification-response.schema.json',
  // Auth
  'authorize-offline-pass-request': 'mqtt/authorize-offline-pass-request.schema.json',
  'authorize-offline-pass-response': 'mqtt/authorize-offline-pass-response.schema.json',
  // Session
  'reserve-bay-request': 'mqtt/reserve-bay-request.schema.json',
  'reserve-bay-response': 'mqtt/reserve-bay-response.schema.json',
  'cancel-reservation-request': 'mqtt/cancel-reservation-request.schema.json',
  'cancel-reservation-response': 'mqtt/cancel-reservation-response.schema.json',
  'start-service-request': 'mqtt/start-service-request.schema.json',
  'start-service-response': 'mqtt/start-service-response.schema.json',
  'stop-service-request': 'mqtt/stop-service-request.schema.json',
  'stop-service-response': 'mqtt/stop-service-response.schema.json',
  // Payment
  'transaction-event-request': 'mqtt/transaction-event-request.schema.json',
  'transaction-event-response': 'mqtt/transaction-event-response.schema.json',
  // Status
  'heartbeat-request': 'mqtt/heartbeat-request.schema.json',
  'heartbeat-response': 'mqtt/heartbeat-response.schema.json',
  'status-notification': 'mqtt/status-notification.schema.json',
  'meter-values-event': 'mqtt/meter-values-event.schema.json',
  'session-ended-event': 'mqtt/session-ended-event.schema.json',
  'connection-lost': 'mqtt/connection-lost.schema.json',
  'security-event': 'mqtt/security-event.schema.json',
  // Config
  'change-configuration-request': 'mqtt/change-configuration-request.schema.json',
  'change-configuration-response': 'mqtt/change-configuration-response.schema.json',
  'get-configuration-request': 'mqtt/get-configuration-request.schema.json',
  'get-configuration-response': 'mqtt/get-configuration-response.schema.json',
  'reset-request': 'mqtt/reset-request.schema.json',
  'reset-response': 'mqtt/reset-response.schema.json',
  // Firmware
  'update-firmware-request': 'mqtt/update-firmware-request.schema.json',
  'update-firmware-response': 'mqtt/update-firmware-response.schema.json',
  'firmware-status-notification': 'mqtt/firmware-status-notification.schema.json',
  // Diagnostics
  'get-diagnostics-request': 'mqtt/get-diagnostics-request.schema.json',
  'get-diagnostics-response': 'mqtt/get-diagnostics-response.schema.json',
  'diagnostics-notification': 'mqtt/diagnostics-notification.schema.json',
  // Maintenance
  'set-maintenance-mode-request': 'mqtt/set-maintenance-mode-request.schema.json',
  'set-maintenance-mode-response': 'mqtt/set-maintenance-mode-response.schema.json',
  // Service Catalog
  'update-service-catalog-request': 'mqtt/update-service-catalog-request.schema.json',
  'update-service-catalog-response': 'mqtt/update-service-catalog-response.schema.json',
  // Certificates
  'sign-certificate-request': 'mqtt/sign-certificate-request.schema.json',
  'sign-certificate-response': 'mqtt/sign-certificate-response.schema.json',
  'certificate-install-request': 'mqtt/certificate-install-request.schema.json',
  'certificate-install-response': 'mqtt/certificate-install-response.schema.json',
  'trigger-certificate-renewal-request': 'mqtt/trigger-certificate-renewal-request.schema.json',
  'trigger-certificate-renewal-response': 'mqtt/trigger-certificate-renewal-response.schema.json',
  // Core
  'data-transfer-request': 'mqtt/data-transfer-request.schema.json',
  'data-transfer-response': 'mqtt/data-transfer-response.schema.json',
  'trigger-message-request': 'mqtt/trigger-message-request.schema.json',
  'trigger-message-response': 'mqtt/trigger-message-response.schema.json',
};

export class SchemaPath {
  constructor(private readonly schemasRoot: string = DEFAULT_SCHEMAS_ROOT) {}

  /** Resolve the absolute path for a schema key (e.g. "boot-notification-request"). */
  resolve(schemaKey: string): string {
    const relative = ACTION_TO_SCHEMA_FILE[schemaKey];
    if (!relative) {
      throw new Error(`Unknown schema key: ${schemaKey}`);
    }
    return join(this.schemasRoot, relative);
  }

  /** Resolve the absolute path for a common schema (e.g. "timestamp"). */
  resolveCommon(name: string): string {
    return join(this.schemasRoot, 'common', `${name}.schema.json`);
  }

  /** Get the schemas root directory. */
  get root(): string {
    return this.schemasRoot;
  }

  /** List all known schema keys. */
  get allKeys(): string[] {
    return Object.keys(ACTION_TO_SCHEMA_FILE);
  }
}
