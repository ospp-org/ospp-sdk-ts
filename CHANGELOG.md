# Changelog

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
