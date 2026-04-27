// Node-only barrel for @ospp/protocol/server.
//
// Anything that touches fs/path/node:crypto or Node Buffer lives here.
// Browser bundles MUST NOT import from this entry.

// Crypto — Node-only
export { canonicalizeToBytes } from './crypto/CanonicalJsonBytes.js';
export { computeMac, verifyMac, signMessage } from './crypto/HmacSigner.js';
export { sign as ecdsaSign, verify as ecdsaVerify, SIGNATURE_ALGORITHM } from './crypto/EcdsaSigner.js';

// Validation — loads JSON Schema files from disk
export { SchemaValidator, type ValidationResult } from './validation/SchemaValidator.js';

// Schema path resolver — uses fileURLToPath(import.meta.url)
export { SchemaPath } from './schemas/SchemaPath.js';
