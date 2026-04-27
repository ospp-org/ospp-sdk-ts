# Changelog

## 0.2.0 — 2026-04-27

### Breaking

- `SchemaPath`, `SchemaValidator`, `computeMac` / `verifyMac` / `signMessage`
  (HMAC), `ecdsaSign` / `ecdsaVerify` / `SIGNATURE_ALGORITHM` (ECDSA), and
  `canonicalizeToBytes` are no longer exported from the package root.
  Import them from `@ospp/protocol/server` instead:

  ```ts
  // before
  import { SchemaPath, SchemaValidator } from '@ospp/protocol';
  // after
  import { SchemaPath, SchemaValidator } from '@ospp/protocol/server';
  ```

- The package is now pure ESM (`"type": "module"`). CommonJS `require()`
  consumers must migrate to `import`. `engines.node` is `>=20`.

### Fixed

- Browser bundlers no longer crash on `import { BayStatus } from '@ospp/protocol'`.
  The previous root barrel re-exported `SchemaPath`, which evaluated
  `path.join(__dirname, '..', 'schemas')` at module load and broke any
  Vite/webpack build that imported a single enum.

### Internal

- Two entry points: `.` (browser-safe) and `./server` (Node-only),
  declared via the `exports` field.
- `sideEffects: false` so bundlers can tree-shake.
- `SchemaPath` switched to `fileURLToPath(import.meta.url)` and resolves
  the schemas root lazily on first access (defense in depth).
- `crypto/CanonicalJsonSerializer` split: pure `canonicalize()` stays in
  `/`, the `Buffer`-returning `canonicalizeToBytes()` moved to `/server`.
- TypeScript compiler target switched to `module: NodeNext` /
  `moduleResolution: NodeNext`; relative imports now use explicit `.js`
  extensions.

## 0.1.0 — 2026-03-22

- Initial release of `@ospp/protocol` covering OSPP wire `protocolVersion`
  `0.2.1` (spec v0.2.5): 27 MQTT actions, envelope, enums, error registry,
  config keys, state machines, topics, HMAC + ECDSA signing, schema
  validation against bundled JSON Schema 2020-12 schemas.
