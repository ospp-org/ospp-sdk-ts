# Changelog

## 0.5.1 — 2026-06-07

Schema-vendoring sync release. Coordinated with `ospp-sdk-php v0.5.1`.
No protocol change. `spec` is **NOT** bumped — its schemas were already
correct as of `v0.5.0`; the drift was in the SDK's vendored copies.

### Fixed

- `src/schemas/ble/` (NEW DIRECTORY, 13 schemas) — re-vendored
  byte-identically from spec `v0.5.0` source. The TS SDK had never
  included BLE schemas; only the PHP SDK had them. When spec `v0.4.2`
  expanded `ble/receipt.schema.json` for `06-security.md §6.2`
  receipt_fields binding, the TS SDK had nothing to expand from.
- `src/schemas/common/receipt.schema.json` — re-vendored
  byte-identically. Description-level update aligning with spec `v0.4.2`
  `§4.8` / `§6.2` v0.4.2 anchors. No wire shape change.
- `src/schemas/common/receipt-data.schema.json` (NEW) — re-vendored
  byte-identically. The canonical `ReceiptData` body that gets
  serialized via OSPP Canonical Form (`§4.8`) and base64-encoded into
  `receipt.data` for ECDSA P-256 signing. Was introduced in spec
  `v0.4.2` but had been missing from this SDK entirely.
- `src/schemas/provisioning-response.schema.json` (NEW) — re-vendored
  byte-identically. Top-level HTTP schema for `POST /api/v1/stations/
  provision` response body. Was introduced in spec `v0.2.5` + refined
  through `v0.3.0`/`v0.4.0`; was missing from this SDK entirely.

`src/schemas/SchemaPath.ts` (sdk-ts-local Node helper, not present in
spec) is left untouched — it maps MQTT action keys to `mqtt/*` paths;
the new schemas under `ble/`, `common/`, and root are accessed via
`resolveCommon()` or direct paths.

### Why this is a v0.5.1 and not v0.5.0 amendment

The `v0.5.0` tag (commit `da1a5fa`) stays valid — it correctly added
the `TransactionEventResponse` `Deferred` discriminated-union variant
(the actual protocol change of the lockstep release). The drift on
receipt-related schemas + the missing `ble/` directory were separate,
pre-existing carry-over from older spec releases. v0.5.1 closes the
drift additively — no force-push or tag rewrite.

### Verification

- `diff -rq --exclude=README.md --exclude=SchemaPath.ts /spec/schemas
  /sdk-ts/src/schemas` = clean (byte-identical).
- `npm test`: `Test Files 23 passed (23) / Tests 804 passed (804)`.
  `SchemaValidator.test.ts` (248 tests) auto-discovers the new schemas
  without regression.

### Coordinated with

- `ospp-sdk-php v0.5.1` — parallel schema-sync release on the PHP SDK
  (where the drift was narrower: just `ble/receipt`, `common/receipt`,
  and the missing `common/receipt-data` — `ble/` was already there).

### Phase B audit pointer

This release closes Phase B audit finding `(a) drift clear` #8 +
inherited drift in `csms-server` vendor for any future TS-side
consumer. The companion mechanism — a CI byte-identity gate that
prevents recurrence — is tracked separately; see Phase B audit
recommendation #1.

## 0.5.0 — 2026-06-06

Lockstep re-synchronization release with `spec` and `ospp-sdk-php`.
First sdk-ts release since `v0.4.0` (2026-05-09); `0.4.1` and `0.4.2`
are unrepresented in this package and intentionally skipped. See
[`spec/adr/ADR-001`](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md)
for the lockstep convention going forward.

### Added

- `TransactionEventResponse` discriminated union gains a 5th variant:
  `{ status: 'Deferred'; reason: string }`. Mirrors the spec 0.5.0
  schema enum addition and closes the type-side gap (csms-server
  already emits `Deferred` on the wire on the §4.2:52 gap-defer path).
  The variant doc-comment articulates the spec 0.5.0 §4.2 step 4
  semantic distinction: `RetryLater` = transient back-off-and-resend;
  `Deferred` = held server-side, NO auto-resend, awaits operator-manual
  unblock OR arrival of missing in-sequence transactions.
- `src/schemas/mqtt/transaction-event-response.schema.json` synced
  byte-identically with the spec 0.5.0 source.
- `src/test-vectors/valid/transaction/transaction-event-response-deferred.json`
  — positive vector for the new enum value, byte-identical with the
  spec conformance vector.

### Carry-over from unreleased work since v0.4.0

This release also ships the previously-untagged work between `v0.4.0`
and HEAD: test-vector bundling for CI, browser-safe / Node-only
entrypoint split (`./server` export condition), session ordering
`seqNo` / `finalSeqNo` fields on session payloads, SessionEnded reason
vocabulary extension (`Local`, `LocalOutOfCredit`, `Deauthorized`).
Those changes were already on `main` since the spec 0.4.0 alignment;
the 0.5.0 tag captures them.

### Migration

- Consumers that exhaustively narrow `TransactionEventResponse` via
  `if (res.status === 'X')` chains MUST add a `Deferred` branch
  (otherwise the union narrowing leaves a residual `Deferred` arm
  unhandled). The discriminant `status` keeps existing branches
  type-safe; adding `Deferred` is purely additive.

### Verification

- `npm test`: Test Files 23 passed (23) / Tests 804 passed (804).
- `npx tsc --noEmit --strict tests/types/payloads.test.ts`: clean.
  RED-first: prior to the union change, the two new test cases
  produced 4 TS errors (TS2322 / TS2367 / TS2339) on the test file —
  see commit `355dc89` for the captured RED output.

### Coordinated with

- `spec v0.5.0` — `TransactionEventResponse` schema enum gains
  `Deferred` + `reconciliation.md §4.1`/`§4.2` document the wire shape
  + `§6.3`/`§6.5` gate-emit-before-INSERT ordering fix + ADR-001
  lockstep convention.
- `ospp-sdk-php v0.5.0` — `TransactionEventStatus::DEFERRED` enum case
  + vendored schema sync + carry-over of `CAPABILITY_NOT_SUPPORTED`
  from the orphaned `v0.4.3`.

## 0.4.0 — 2026-05-09

Aligns the SDK with OSPP spec v0.4.0 (`ospp-org/spec` tag `v0.4.0`,
2026-05-07). Spec v0.3.0 was an HTTP-provisioning-only release and
introduced no MQTT-side changes; the SDK skips a published v0.3.0 and
jumps directly from v0.2.0 to v0.4.0.

### Added

- `SessionEndReason` extended from 2 to 5 values: `LOCAL`,
  `LOCAL_OUT_OF_CREDIT`, `DEAUTHORIZED`. Bundled
  `session-ended-event.schema.json` reason enum updated to match.
  Per spec §6 refund policy, `LocalOutOfCredit` and `Deauthorized`
  mandate `creditsCharged: 0`. (Spec v0.4.0 Item 8.)
- Optional `seqNo` on `MeterValuesPayload` and `SessionEndedPayload`
  — per-session monotonic counter starting at 0, incrementing by 1
  per session-scoped EVENT. (Spec v0.4.0 Item 3.)
- Optional `finalSeqNo` on `SessionEndedPayload` and on
  `StopServiceResponse` Accepted variant — canonical session-final
  marker; servers discard `MeterValues` with `seqNo > finalSeqNo` for
  the same `sessionId` post-stop. (Spec v0.4.0 Item 3.)

### Changed

- `crypto/CanonicalJsonSerializer` documentation comment now
  references spec §4.8 (OSPP Canonical Form) — the formalized
  algorithm location used by §5.3 (HMAC) + §6.2 (ECDSA). No behavior
  change; existing implementation already matched §4.8 exactly.
  (Spec v0.4.0 Item 4.)

### Migration

This release requires a **coordinated v0.3.0 → v0.4.0 stack upgrade**
because v0.3.0 servers will reject `SessionEnded` payloads carrying
`Local`, `LocalOutOfCredit`, or `Deauthorized` via JSON-schema
validation. Pre-launch context (no field deployments) makes this
acceptable. See spec CHANGELOG `0.4.0 — Migration` for full details.

The new `seqNo` / `finalSeqNo` fields are OPTIONAL and additive;
v0.3.0 servers ignore unknown fields per `02-transport.md §10.1`
forward-compatibility. Wire `protocolVersion` remains `"0.2.1"`.

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
