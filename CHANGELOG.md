# Changelog

## 0.12.0 — 2026-08-05

**SDK-pair release against spec `v0.11.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as
`ospp/protocol` **0.12.0**, from the same spec pin.

`.spec-ref` **v0.10.0 → v0.11.0**.

> **BREAKING — this release implements a contract that breaks every consumer built against
> the previous one.** Spec `v0.11.0` breaks the wire in five places at once and folds them
> into a single `protocolVersion` move to `0.3.0`. Types are deleted rather than deprecated,
> because in each case there is no correct narrower thing for the old symbol to mean. There
> is no compatibility window and no shim.
>
> **Deploy order is not a preference.** A receiver must accept a new form before any sender
> emits it. Two items are a total fleet outage if enforced early: exact-match version
> negotiation, and MAC enforcement. Read *Breaking changes, and the order they must ship in*
> in the spec's CHANGELOG before deploying any of this.

### Added

- **`StationState` + `StationStateMachine`** — the station's own machine, six states, and
  the **outermost** one: every other machine on a station is scoped inside it. Neither SDK
  had it. `Pending`, `Rejected` and `Accepted` previously existed here only as inline string
  literals inside the `BootNotificationResponse` union, unexported, with nothing reading
  `response.status` at all.

  `Pending` and `Rejected` are **restricted** states and differ in exactly one respect —
  whether the station answers commands. The rows are predicates, not prose. The load-bearing
  one: `Pending` **holds** a session key and `Rejected` does not, so the repair channel the
  `Pending` window exists for is actually usable. A test pins the two against each other —
  no state may answer a command in a state where it holds no key.

  There is no edge from a restricted state to `Operational`. A station leaves one only by
  re-sending BootNotification and being `Accepted`; the server cannot promote it in place.

- **`ProtocolVersion`** — a type this SDK did not previously have at all, with
  `isSupportedBy(set)`. An empty set accepts nothing rather than silently accepting every
  station.

- **Topology types** — `bays[]`, each entry carrying `bayNumber` and that bay's
  `programNumbers`. Comparison is by **set**, in both directions: order carries no meaning,
  so a station that re-orders its declaration between boots must not be held out of service,
  and a bay present on one side only is a mismatch whichever side it is on. Labels are never
  compared — a corrected typo in a firmware constant must not put a station into `Pending`.
  Bounds (64 bays, 32 programs) are asserted against the vendored schema rather than
  transcribed from it.

- **`3017 PROGRAM_NOT_DECLARED`** and **`3018 TOPOLOGY_MISMATCH`**; registry total 114 → 116.

- **`EffectedBy`** — the canonical bay table's party column.

- **`canonical-json-vectors.json`** — eleven shared cross-language vectors, byte-identical
  with the sibling copy in `ospp/protocol`, pinning the exact canonical string both SDKs
  must produce.

### Changed

- **`BayStateMachine.canTransition` now requires the party** as an argument rather than
  defaulting to one. The default *was* the merge that let the two SDKs implement different
  halves of the same table. Twenty `Station` rows, six `Server`, twenty-six in all; a
  station is held to the twenty and MUST NOT effect a `Server` row.

- **`sessionKey` is REQUIRED on both `Accepted` and `Pending`** BootNotification responses.
  It was optional on `Accepted` — precisely the shape `boot-notification.md` §5.3 calls
  malformed — and absent from `Pending`, which would have closed the repair channel.

- **Signing default is `All`**, and the config key moves Dynamic → Static: the mode is bound
  to the session key, which is issued at boot.

- **`MessageSigningRegistry` replaces `CriticalMessageRegistry`**, holding only the three
  structural exemptions and keying on `(action, messageType)` rather than on `action` alone.
  The old axis could not tell the BootNotification REQUEST from its RESPONSE, and the two
  are exempt for different reasons — one precedes the key, one carries it.

### Removed

- **`ResetType`** — deleted, not narrowed. `Hard`/`Soft` are gone; one reboot operation
  remains, carrying an optional `force`. No value of the message clears credentials: OSPP
  keeps no bootstrap credential, so a remote wipe would leave the station unreachable by
  every channel it has.

- **`SigningMode.Critical`** — with everything signed it selected nothing, and the 47-row
  per-message classification table goes with it.

- **`bayCount` / `bayIds`** from the wire types, with no compatibility window; **`services[]`
  on StatusNotification becomes `programs[]`**. Programs are physical operations the firmware
  owns with ordinals fixed at manufacture; services are minted by the server. The old shape
  required a station to name a server-minted service in the very message CORE-004 demands at
  first boot, so a conforming first boot was impossible.

### Fixed

- **A station could not verify an inbound MAC at all.** `computeMac`, `verifyMac` and
  `signMessage` shipped only from the Node-only `@ospp/protocol/server` subpath, because they
  were built on `node:crypto` and the root entry is asserted browser-safe. Station and app
  code imports the root. So the reference implementation could not verify an inbound MAC from
  the entry point its own consumers use — for the whole class of message this release has just
  made universal.

  That is packaging, not cryptography. The implementation moves to `MessageMac.ts` on
  `@noble/hashes`, the same pure-JS pipeline `SessionCrypto` already validates byte-identically
  against the spec's conformance corpus. `HmacSigner.ts` re-exports it, so `/server` keeps every
  symbol it had, and `dist/index.js` still passes the transitive browser-safety walk. The golden
  HMAC vectors pass unchanged — output is byte-identical to the `node:crypto` implementation it
  replaces.

  Two pieces had to be written rather than borrowed, and both matter: **base64 decode is
  strict** (Node's decoder silently skips characters outside the alphabet, which is what let a
  garbage session key decode to zero bytes and become the empty HMAC key — this one returns
  `null`), and **constant-time compare**, since `crypto.timingSafeEqual` is Node-only and §5.5
  requires it.

- **MAC handling fails closed in both directions.** Signing with an undecodable key raises;
  verification without a key returns `false`. Previously a degraded key still produced a
  well-formed MAC, so two peers both holding garbage verified each other successfully, and
  anyone who knew the key was invalid could forge with the empty one.

- **61 vendored vectors were dropped in silence.** The corpus was 306 and only 245 ever ran:
  the whole BLE `offline` category by an explicit `continue`, and fifteen more because the
  filename-prefix search stopped at two parts and `hello`, `receipt` and `challenge` are
  single-word schema names. Coverage read as complete because nothing counted what was
  missing. Unmapped vectors are now collected and asserted — the corpus is **316**, and
  exactly 61 resolve to no MQTT schema key, all of them `offline/`, which `ospp/protocol`
  validates against `schemas/ble/*`. The split is now stated rather than implied.

- **Stale spec cross-references.** Spec `v0.11.0` inserted the station machine as
  `05-state-machines.md` §1 and renumbered every machine under it. Five docblocks in `src/`
  still cited pre-insertion numbers — `BayStatus` (×2) pointed at §1.2, which is now the
  **station's** states, while meaning the bay's; `SessionStateMachine` §2 → §3,
  `ReservationStateMachine` §3 → §4, `FirmwareStateMachine` §5 → §6. Nothing looked broken,
  which is why they survived.

### Vendored

- `src/schemas/` — byte-identical to spec `v0.11.0`, 86 files, verified through
  `scripts/check-schemas.sh`'s own clone path.
- `src/test-vectors/` — 316 vectors, byte-identical to the tag's
  `conformance/test-vectors/`.
- `tests/crypto/fixtures/signing-classification.json` — `specRef` was a sentence explaining
  that the tag did not yet exist; it now reads `v0.11.0`. Byte-identity with the
  `ospp/protocol` copy is preserved.

### What breaks

| Caller | Breaks | What to do |
|---|:---:|---|
| Imports `ResetType` | **yes** | Deleted. One reboot operation, optional `force`. |
| Calls `SigningMode.Critical` or `CriticalMessageRegistry` | **yes** | Use `MessageSigningRegistry`; the default is now `All`. |
| Calls `canTransition(from, to)` on a bay | **yes** | Pass the party — `EffectedBy.STATION` or `EffectedBy.SERVER`. There is deliberately no default. |
| Builds a BootNotification with `bayCount` / `bayIds` | **yes** | Declare `bays[]`, each with `bayNumber` + `programNumbers`. |
| Reads `services[]` off a StatusNotification | **yes** | Now `programs[]`, and the set MUST EQUAL the bay's declaration. |
| Constructs a `BootNotificationResponse` | **yes** | `sessionKey` is required on `Accepted` **and** `Pending`. |
| Relies on a MAC being produced from an invalid key | **yes** | Signing now raises; verification returns `false`. This was a forgery path. |
| Imports `computeMac` / `verifyMac` from `/server` | no | Still exported there, unchanged. Now also available from the root entry. |

---

## 0.11.0 — 2026-07-30

**SDK-pair release against spec `v0.10.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as
`ospp/protocol` **0.11.0**, from the same spec pin.

`.spec-ref` **v0.9.0 → v0.10.0**.

> **Breaking for code that puts a bay status on the wire — and NOT by removing an enum
> member.** Spec `v0.10.0` removed `Unknown` from `bay-status.schema.json`. **`BayStatus`
> keeps all seven members.** Read the next section before changing any code.

### Added

- **`ReportableBayStatus`** — `Exclude<BayStatus, BayStatus.UNKNOWN>`. The six states that
  may appear in a message. Derived from `BayStatus` rather than re-listed, so the two
  cannot drift.

- **`isReportableBayStatus(status)`** — runtime narrowing to the above. The type alias is
  erased at runtime, so a value parsed from JSON, or read out of a bay's current state,
  needs this before it can be trusted as wire-legal.

- **`npm run typecheck`** (`tsconfig.test.json`) — type-checks `src/`, `tests/` **and**
  `scripts/`. See *The gap this release closes* below.

### Changed

- **`StatusNotificationPayload.status` and `.previousStatus` are now `ReportableBayStatus`**
  instead of `BayStatus`. These are the only two typed wire slots that carried it; this SDK
  ships no BLE payload types, so `ble/available-services` needs nothing here.

  **`BayStatus` keeps all seven members**, and for a different reason than in
  `ospp/protocol`. There, the enum is lowercase-backed and is the *domain* vocabulary. Here
  the values *are* the wire strings — but the enum is also the state type of
  `BayStateMachine`, whose default initial state is `UNKNOWN`, which the spec **requires**
  (`01-architecture.md` §7.3, First Boot step 1: *"All bays initialize to Unknown"*).
  Removing the member would delete the FSM's starting state.

  So the vocabulary splits rather than shrinks: `BayStatus` is what a party **holds**,
  `ReportableBayStatus` is what a party may **send**.

- **`BayStateMachine` is untouched** — still seven states, still 23 transitions, still
  defaulting to `UNKNOWN`. It models the FSM, and the FSM did not change.

### Vendored

- `src/schemas/common/bay-status.schema.json` — enum 7 → 6 values. One file of 85.
- `src/test-vectors/valid/core/status-notification-unknown.json` →
  `invalid/core/`, unmodified and byte-identical to the spec's copy. Counts match the spec
  exactly: valid 157 → 156, invalid 149 → 150, total **306** unchanged. The vector loader
  globs both directories and decides pass/fail by location, so no test edit was needed.

### What breaks

| Caller | Breaks | What to do |
|---|:---:|---|
| Assigns into `StatusNotificationPayload.status` / `.previousStatus` | **yes** | `BayStatus.UNKNOWN` no longer assignable. If you were reading a bay machine's current state into a payload, gate on `isReportableBayStatus()` — that pattern is the bug this release exists to prevent. |
| Holds, compares or switches on `BayStatus` | no | All seven members remain. |
| Uses `BayStateMachine` | no | Unchanged, including its `UNKNOWN` default. |
| Parses a StatusNotification off the wire | **yes, at runtime** | The vendored schema now rejects `Unknown`; `SchemaValidator` will fail such a payload. |

### The gap this release closes

`tsconfig.json` excludes `tests`, and `npm test` is `vitest run`, which transpiles via
esbuild without type-checking. **Nothing in this repository had ever type-checked a test
file.** That is a silent gap, not merely a missing one: a stale enum reference compiles to
`undefined` rather than failing, so a comparison against it becomes a permanently-false
branch that no test notices.

`npm run typecheck` closes it. The tree is clean. Demonstrated rather than asserted — with
`BayStatus.UNKNOWN` injected into a `StatusNotificationPayload`:

```
npm run typecheck  ->  error TS2322: Type 'BayStatus.UNKNOWN' is not assignable
                       to type 'ReportableBayStatus'
npx vitest run     ->  63 passed
```

It also found a real, pre-existing defect on its first run: a comment in
`tests/types/payloads.test.ts` reading *"not with / `@ts-expect-error`. This repo's tsconfig
excludes tests…"* — prose explaining why the author had **not** used the directive.
TypeScript reads a comment line beginning with those two words as a directive regardless of
what follows, so it was a live, unsatisfied `@ts-expect-error` that nothing had ever
evaluated. Reworded.

### Fixed

- `package-lock.json` carried `"version": "0.9.0"` while `package.json` said `0.10.0` — the
  0.10.0 release bumped only the manifest. Both now read `0.11.0`.

---

## 0.10.0 — 2026-07-29

**SDK-pair release against spec `v0.9.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as
`ospp/protocol` **0.10.0**, from the same spec pin. The spec is **not** re-tagged —
it already carries `v0.9.0`.

`.spec-ref` **v0.8.1 → v0.9.0**.

**Breaking, and the audience differs per change — read the three separately.** Spec
`v0.9.0` carried three independent bodies of work that shared a tag because none of
them cut one of their own. Two are breaking here, for **different** groups of
callers:

| Body | Breaks | Who has to act |
|---|---|---|
| `Deferred` arm removed from `TransactionEventResponse` | **producers** of that value | code that *constructs* `{ status: 'Deferred' }` |
| `errorText` constrained to UPPER_SNAKE_CASE | **producers** of that field | code that *emits* `errorText` as prose — a previously-valid payload is now schema-invalid |
| `provisioning-response` description | **nobody** | description text only, no validation behaviour change |

Note the asymmetry with `ospp/protocol`, and it is not cosmetic: PHP models this as an
**enum**, so retiring a case breaks *consumers* who exhaust it. TypeScript models it as
a **discriminated union**, and removing a member does **not** break exhaustive
narrowing — an `if (res.status === 'X')` chain simply loses a residual arm. Here the
break falls on **construction**, not consumption.

### Removed (BREAKING — code constructing the value)

- **The `{ status: 'Deferred'; reason: string }` arm of `TransactionEventResponse`**,
  and the operator-manual-unblock prose in its docblock. The union is now four arms:
  `Accepted` | `Duplicate` | `Rejected` | `RetryLater`.

  Spec 0.9.0 retired the value together with the `txCounter` gap-blocking rule it was
  invented to express — it had no design rationale of its own, having been added to
  the schema in spec 0.5.0 two days *after* the reference server began emitting it.
  Its stated exit, *operator-manual unblock*, was referenced normatively in five spec
  documents and implemented in **none**, so a transaction answered `Deferred` could
  not be settled by any code path in any repository. `RetryLater` is now the only
  non-terminal status.

  **Reading code is unaffected.** Narrowing on `res.status` keeps compiling; the
  `Deferred` branch simply becomes unreachable and can be deleted. **Constructing**
  the value no longer type-checks. Within this repository the only constructors were
  two test cases — `src/` declares the union and re-exports the type and never builds,
  narrows, or switches over it.

### Changed (BREAKING — producers of `errorText`)

- **Vendored `src/schemas/` and `src/test-vectors/` re-vendored from spec `v0.9.0`.**
  17 schemas and 5 vectors changed. Only one schema and one vector belong to the
  `Deferred` retirement; the rest are the two bodies that rode along in the tag:

  | Origin | Files | Change |
  |---|--:|---|
  | `Deferred` retirement | 1 schema + 1 vector | `mqtt/transaction-event-response.schema.json` — `status` enum 5 → 4 **and** the fourth `allOf` branch that required `reason` on `Deferred`; the deferred vector moves `valid/` → `invalid/` |
  | `errorText` enforcement | 15 schemas + 5 vectors | `pattern: ^[A-Z][A-Z0-9_]+$` wherever `errorText` pairs with `errorCode` (16 declarations); 8 also gained corrected descriptions; 5 invalid vectors now carry the registry name of the code they already declared |
  | provisioning trust anchor | 1 schema | `provisioning-response.schema.json` — `stationCaChain` description no longer names `brokerRootCa` as the universal anchor. **Description only** |

- **`errorText` is a machine-readable name and is now enforced as one.** Spec §1.3 has
  always defined it as *"Machine-readable error name in UPPER_SNAKE_CASE (e.g.
  `BAY_BUSY`)"*, but only one of the sixteen schemas declaring it enforced that shape.
  A payload that put prose in `errorText` and validated before will now fail
  validation. Emit the registry name; prose belongs in `errorDescription`.

### Verification

- **The schema-identity gate RAN**, and that is the claim — not its exit code.
  `scripts/check-schemas.sh` cloned `ospp-org/spec` at `v0.9.0`, checked out
  `7a448ed`, and reported *"OK — vendored src/schemas/ are byte-identical to spec
  v0.9.0"*. **Falsified before being trusted:** mutating one vendored schema makes it
  report `DRIFT detected` and name the file. Restored, re-run green.

- **The test lock almost shipped hollow, and the near-miss is the useful part.** The
  natural inversion for a removed union member is `@ts-expect-error` on an assignment
  — and in this repository that assertion is checked by **nothing**: `tsconfig.json`
  excludes `tests`, there is only one tsconfig, and `npm test` is `vitest run`, which
  does not typecheck. Verified: `npx tsc --noEmit` exits 0 without ever reading the
  test file. The lock would have passed whether or not the arm came back.

  Replaced with a **runtime** assertion against the vendored schema — the wire
  contract, and executable: `{ status: 'Deferred' }` must fail
  `transaction-event-response` validation, with a positive control asserting
  `RetryLater` still validates, so the test cannot pass because the schema key is
  wrong or the validator rejects everything. Proven non-hollow: re-adding `Deferred`
  to the vendored schema fails the case by name, then reverted.

- **A second lock came free with the re-vendor.** `SchemaValidator.test.ts` discovers
  vectors dynamically and asserts every `invalid/` vector fails, so vendoring the
  spec's new invalid deferred vector pins the retirement by corpus as well as by the
  explicit case. Vector count stays **306** because it is −1 valid / +1 invalid, and
  both trees are byte-identical to spec `v0.9.0`.

- **Suite:** `vitest run` → **28 files, 900 tests passed**. Baseline measured on the
  clean tree before any edit: 28 files, 901 tests. The single-test delta is exact —
  two `Deferred` cases became one inversion, and `SchemaValidator.test.ts` stays at
  250 because the vector moved rather than vanished. `npm run build` (tsc over
  `src/`): exit 0.

- **One artifact was excluded rather than committed.** `cp -r` from the spec brought
  `src/schemas/README.md`, a file this repository has never carried and which
  `check-schemas.sh` explicitly `--exclude`s. It was caught in `git status`, not by
  the gate — the gate is configured to ignore it, so it would have passed review
  invisibly.

### Migration

```diff
  if (res.status === 'Accepted')    { /* ... */ }
  else if (res.status === 'Duplicate')  { /* ... */ }
  else if (res.status === 'Rejected')   { /* ... */ }
  else if (res.status === 'RetryLater') { /* ... */ }
- else if (res.status === 'Deferred')   { /* remove — unreachable */ }
```

A server still emitting `Deferred` is emitting a value the wire schema no longer
admits and no station can act on. There is no replacement status: the condition that
produced it — a `txCounter` discontinuity — is now settled normally and raised as an
operator alert on the **station**.

---

## 0.9.0 — 2026-07-29

Error-code parity with `ospp-sdk-php` at the same version, plus two hand-written
types corrected against the schemas vendored beside them. **The version jumps
`0.7.0` → `0.9.0` deliberately**: the two SDKs implement one contract, and a
consumer must be able to tell which pair is coherent. There is no 0.8.x on npm.

`.spec-ref` → **v0.8.1**. The vendored schemas are unchanged and remain
byte-identical to that tag; 0.8.1 corrected §4.4's endpoint rows and §3.4
registry text, not the schemas.

### Added

- **Seven error codes: 107 → 114**, matching the spec's own stated total.
  `2019 PROVISIONING_TOKEN_INVALID` (§3.2) and `4015`–`4020` (§3.4:
  `PROVISIONING_KEY_MISMATCH`, `PROVISIONING_KEY_REUSE`,
  `PROVISIONING_REQUEST_INVALID`, `PROVISIONING_TOKEN_CONSUMED`,
  `PUBLIC_KEY_INVALID`, `BAY_COUNT_MISMATCH`). `ospp-sdk-php` has carried all
  seven since v0.8.0; this closes the gap in the other direction. Range counts
  are now 15 / 20 / 17 / 20 / 34 / 8.
- **A gate that type-checks the spec's own vectors against the hand-written
  types** (`npm run check:vector-types`). Both release gates `diff -rq` the
  vendored schema trees, so `src/types/` sat outside every gate — which is how
  the two defects below survived with the schemas byte-perfect the whole time.

### Fixed — consumer-visible type changes

- **`BootNotificationResponse`, `Rejected` variant now requires `errorCode`
  and `errorText`.** They were absent entirely — not optional — while
  `boot-notification-response.schema.json` makes `retryInterval`, `errorCode`
  and `errorText` a single `then.required` group for that status. It was the
  only `Rejected` variant in the SDK missing them, and the SDK's own test had
  enshrined the omission.

  **This is the change most likely to be noticed.** Code that *constructs* a
  Rejected BootNotification response will no longer compile until it supplies
  both fields — which is the point: it was emitting responses the schema
  rejects. Code that only *reads* such responses is unaffected.

- **`NetworkInfo.signalStrength` is now `number | null`.** The schema says
  `["integer","null"]` and the spec's canonical BootNotification example sends
  `null`, so that example could not be assigned to the type. Widening a field
  does not break existing readers unless they had already excluded `null`.

Proof for both, the spec's vectors compiled under `tsc --strict`: `TS2353` on
`errorCode` for both Rejected vectors and `TS2322` on `null` for the canonical
example before; exit 0 after.

### Note — `httpStatus` is an SDK extension, not the contract

The registry's `httpStatus` field is **not** derived from the specification and
should not be treated as protocol. `07-errors.md` §4.4 states that *"the status
is not a property of the code"*, that §2.4's table *"assigns no code a fixed
status"*, and that one code can honestly appear with more than one status —
§2.4's own table lists `2008` under both `401` and `403`.

This SDK and `ospp-sdk-php` **disagree on 51 of the 114** codes here. Everything
else in the two registries is identical: code numbers, names, `severity`,
`recoverable`, the category partition, and the vendored schemas. Recorded in the
spec's `KNOWN-ISSUES.md` as one finding together with `category`, which has the
same cause. Use the status a server actually returned; do not use this field to
decide one.

## 0.7.0 — 2026-07-10

TLS 1.2 floor (lockstep, ADR-011). Re-vendors `src/schemas/provisioning-response.schema.json`
at spec **v0.7.0**: the MQTT `tlsVersion` field widens from `["1.3"]` to
`["1.2","1.3"]` (default `"1.3"` → `"1.2"`) with floor semantics (the minimum
version the station must support; the broker accepts it or higher). Lowers the
MQTT/mTLS transport floor from TLS-1.3-only to TLS 1.2+ (TLS 1.3 recommended),
admitting TLS-1.2-capped cellular modems (e.g. SIMCom A7608E-H); sub-1.2
rejected, 0-RTT forbidden, mTLS unchanged. `.spec-ref` → `v0.7.0`.

No TS code change — the SDK ships no generated `tlsVersion` type (schemas are
copied to `dist/`, not compiled), and 0.7.0 adds no new error code
(provisioning-token §2 reuses existing 401 codes). Also **removes the dead
`lint` script**: it invoked `eslint`, which was never a declared dependency (no
eslint in `devDependencies`, no eslint config, not run by CI) — a script that
cannot run is not a gate. The real gates are `build` (tsc) + `test` (vitest),
both green (tsc clean, vitest 905/905).

## 0.6.2 — 2026-06-23

Version alignment with `ospp-sdk-php v0.6.2` (lockstep, ADR-011) — **publishes
the package.json version bump that the v0.6.0/v0.6.1/v0.6.2 release commits
missed**. Those commits aligned `.spec-ref` to the spec tag but never bumped
`package.json` (it stayed at `0.5.7`), so the tag-push publish workflow ran
`npm publish` against `0.5.7` and got a 403 "cannot publish over previously
published versions" — leaving npm frozen at `0.5.7` while git carried v0.6.x
tags (decoupled). This commit bumps `package.json` + `package-lock.json` to
`0.6.2` so the publish workflow can ship the cumulative 0.6.x content to npm.

The schema/code content (`src/schemas`, test-vectors, enums) was already at
v0.6.2 on these tags — only the package version field was stale. No wire
change beyond what the 0.6.x spec already defined.

### Changed

- `package.json` + `package-lock.json` version `0.5.7` → `0.6.2` (version field
  only; no dependency changes).

### Included (cumulative 0.6.0 → 0.6.2, never reached npm under 0.5.7)

- **Auth-form (Partial A) TransactionEvent** — `transaction-event-request`
  schema `oneOf` carrying `{authId, sessionId}` (vs pass-form `offlinePassId`),
  the `transaction-event-request-auth-form` test vector, and the
  `server-signed-auth-claims` schema (landed v0.6.1).
- **Enum catch-up (v0.6.2)** — `SecurityEventType.ServerSignedAuthReplay` +
  error `2018 SERVER_AUTH_NONCE_MISMATCH`, aligned to the spec schema.

### Verification

- `tsc` build clean; full vitest suite green — confirms the version bump is
  inert to behavior (no code touched, only the version field).

## 0.5.7 — 2026-06-18

Version alignment with `ospp-sdk-php v0.5.7` (lockstep, ADR-011). **No code
change** — the v0.5.7 fix (left-pad the OpenSSL-stripped P-256 private scalar
to 32 bytes) is PHP-only. This TS SDK extracts `d` via Node's JWK export, which
pads to the fixed 32-byte field width (empirically confirmed on the very key
that breaks PHP), so it never had the strip bug. `spec` is **NOT** bumped (no
spec change). No wire change.

### Changed

- Version bump only, to keep the sibling SDKs at the same version per ADR-011.
  `EcdsaSigner` is unchanged — `extractP256Scalar` already requires a 32-byte
  `d` and Node's JWK `d` is fixed-width, so no short-scalar path exists in TS.

### Verification

- Full suite 837 vitest passing; `tsc` build clean — confirms the bump
  introduced no change.

---

## 0.5.6 — 2026-06-15

Version alignment with `ospp-sdk-php v0.5.6` (lockstep, ADR-011). **No code
change** — `CAPABILITY_NOT_SUPPORTED` (6008) was never present in this TS SDK
(it was a PHP-only orphan); PHP removed it in v0.5.6, so the two SDKs now match
exactly. `spec` is **NOT** bumped (6008 was never in the spec). No wire change.

### Changed

- Version bump only, to keep the sibling SDKs at the same version per ADR-011.
  `OsppErrorCode` is unchanged — the 6xxx range was already 6000-6007 (no 6008).

### Verification

- Full suite 819 vitest passing; `tsc` build clean — confirms the bump
  introduced no change.

---

## 0.5.5 — 2026-06-13

BootNotification HMAC exemption. Coordinated with `ospp-sdk-php v0.5.5`
(lockstep, ADR-011) and `spec` §5.6. `spec` is **NOT** bumped
(classification correction, no schema change). No wire change — `mac`
is already optional in the envelope schema.

### Changed

- `BootNotification` RESPONSE moved from `CRITICAL_MESSAGE_TYPES` into
  `ALWAYS_EXEMPT`, so the whole action is now exempt from HMAC in **every**
  `MessageSigningMode` (the REQUEST was already always-exempt). Its MAC is
  cryptographically void — the `sessionKey` that would verify the RESPONSE
  is delivered *in* that message; mTLS protects delivery, not HMAC. Counts
  move 32→31 critical, 15→16 exempt, 2→3 always-exempt.

### Verification

- Full suite 819 vitest passing; `tsc` build clean. RED-first pins
  `requiresHmac(BootNotification, RESPONSE, mode) === false` for None,
  Critical, and All.

---

## 0.5.4 — 2026-06-11

ECDSA deterministic-nonce hardening. Coordinated with `ospp-sdk-php v0.5.4`
(lockstep — matching RFC 6979 + low-s policy). `spec` is **NOT** bumped:
RFC 6979 is already mandated by §4.3/§6.2; this brings the implementation
into compliance. No wire change — the DER signature encoding is unchanged.

### Fixed

- ECDSA signing replaced `node:crypto`'s random-nonce ECDSA (a spec-MUST
  violation, and non-reproducible across runs) with `@noble/curves` p256,
  which uses RFC 6979 deterministic nonces by default
  (`p256.sign(message, scalar, { format: 'der', prehash: true })`). Also
  corrects a stale docstring that claimed "Node uses RFC 6979 by default",
  which `EcdsaSigner.test.ts` had already contradicted in-place. PEM/DER/
  KeyObject inputs are accepted via Node JWK export → 32-byte scalar.
  Verify is unchanged (nonce-agnostic; backward-compatible with pre-0.5.4
  signatures).

### Verification

- New unit tests assert byte-identical determinism (single pair + 10×
  loop), cross-verified against `node:crypto`.
- Full suite: 818/818 vitest passing.

---

## 0.5.3 — 2026-06-07

UserSub derivation lift. Coordinated with `ospp-sdk-php v0.5.3`. `spec`
is **NOT** bumped — the derivation rule (`sub` = `sub_` + UUID with
hyphens stripped) is implicitly normative via the existing
`^sub_[a-zA-Z0-9]+$` regex on the OfflinePass `sub` field
(`schemas/common/offline-pass.schema.json`); the spec prose does not
call it out but the schema regex forces it. No wire change.

### Why

The derivation rule lived only in csms-server (`App\Shared\ValueObjects\
UserSub`) prior to v0.5.3 — a latent drift risk if a firmware or
alternative pass issuer ever derives a `sub_*` independently. Lifting
into the SDK makes it the cross-ecosystem source of truth so PHP and
TS implementations cannot drift.

### Added

- `UserSubject` class with static `fromUserId(userId: string): string`,
  exported from a new `src/identity/` folder. Returns
  `'sub_' + userId.replaceAll('-', '')`. Byte-identical with the
  PHP SDK counterpart (`Ospp\Protocol\ValueObjects\UserSubject::
  fromUserId`).
- New top-level export in `src/index.ts`.

### Verification

- 8 unit tests in `tests/identity/UserSubject.test.ts` covering
  canonical csms-server vectors plus cross-language byte-equality
  vectors (empty, single hyphen, multi-hyphen, UTF-8 multibyte).
- Cross-language proof: identical UTF-8 hex output on all 8 vectors
  vs `ospp-sdk-php v0.5.3` `UserSubject::fromUserId`. The unicode
  vector `user-é-moji🎉` → `sub_userémoji🎉` produces the same
  byte sequence `7375625f75736572c3a96d6f6a69f09f8e89` in both SDKs,
  pinning UTF-8-safe behavior (no surrogate / continuation-byte
  drift).
- Full suite: 817/817 vitest passing; `tsc` build clean.

---

## 0.5.2 — 2026-06-07

Enum-drift sync release. Coordinated with `ospp-sdk-php v0.5.2`. `spec`
is **NOT** bumped — codes 2014-2017 have been in `07-errors.md §3.2`
since the `v0.4.2` spec release; the SDK enums simply missed sync. Same
historical-drift pattern as the `v0.5.1` schema sync release.

### Added

- `OsppErrorCode.OFFLINE_PASS_REVOKED = 2014` (`Error`, non-recoverable,
  401). Individual pass revocation; distinct from `2004
  OFFLINE_EPOCH_REVOKED` (batch by epoch bump).
- `OsppErrorCode.OFFLINE_ORG_MISMATCH = 2015` (`Error`, non-recoverable,
  403). Pass `organization_id` ≠ reporting station's `organization_id`.
- `OsppErrorCode.OFFLINE_USER_MISMATCH = 2016` (`Error`, non-recoverable,
  401). Pass `user_id` ≠ envelope `userId`.
- `OsppErrorCode.OFFLINE_RECEIPT_MISMATCH = 2017` (`Critical`,
  non-recoverable, 401). Signed receipt field disagrees with cross-
  check target. Severity elevated to `Critical` per spec — receipt-
  body tampering is a stronger integrity violation.
- `OSPP_ERROR_REGISTRY` extended with 4 metadata entries placed in a
  new `v0.5.2 spec v0.4.2 §3.2 additions` sub-section for diff clarity.

### Updated

- `OSPP_ERROR_REGISTRY` `httpStatus` values for `2016 OFFLINE_USER_MISMATCH`
  (was `401` → now `403`) and `2017 OFFLINE_RECEIPT_MISMATCH` (was `401`
  → now `422`), semantically aligned cross-SDK with `ospp-sdk-php v0.5.2`.
  Spec §2.4 does not normatively specify httpStatus for these codes;
  both SDKs converge on values chosen by RFC 9110 semantics:
  - `2014 OFFLINE_PASS_REVOKED → 401` — revoked credential ≡ credential
    no longer valid; RFC 9110 401 "credential invalid". (no change in TS)
  - `2015 OFFLINE_ORG_MISMATCH → 403` — pass valid but used cross-org;
    RFC 9110 403 "authenticated, not permitted for this resource".
    (no change in TS)
  - `2016 OFFLINE_USER_MISMATCH → 403` — pass valid but bound to a
    different user than the envelope claims (same shape as
    `2006 OFFLINE_STATION_MISMATCH`). **Changed from 401 → 403** to
    reflect the credential-fine-context-wrong semantic.
  - `2017 OFFLINE_RECEIPT_MISMATCH → 422` — signature itself verified
    per spec §3.2; cross-check failure is "syntax correct, instructions
    inconsistent" ≡ RFC 9110 422 Unprocessable Entity. **Changed from
    401 → 422** because auth itself succeeded — the failure is
    content cross-check, not authentication.

### Verification

- `npm test`: `Test Files 23 passed (23) / Tests 809 passed (809)`.
- `--filter tests/enums/OsppErrorCode.test.ts`: `52 passed`.
- `npm run build`: clean.
- RED-first on enum addition: prior to the enum addition, the four
  code-specific tests + the count assertions produced 6 failures in
  the focused suite — see commit `76d9415` for the captured output.
- RED-first on httpStatus alignment: prior to changing 2016/2017
  registry values, the cross-SDK parity test failed expecting `403`
  / `422` but receiving `401` / `401` — confirms 2016/2017 were
  semantically misaligned vs the chosen cross-SDK values.

### Migration

- Consumers that exhaustively type-narrow on `OsppErrorCode` (e.g.
  `switch (code)` chains) MUST add arms for the 4 new codes or fall
  through to a default. The discriminant `code` keeps existing arms
  type-safe; adding the 4 is purely additive.

### Coordinated with

- `ospp-sdk-php v0.5.2` — parallel addition of the same 4 cases +
  metadata in `OsppErrorCode` PHP enum.

### Known follow-up

- `CAPABILITY_NOT_SUPPORTED = 6008` was added to `ospp-sdk-php` at its
  `v0.4.3` for csms-server admin-action coverage but never propagated
  to this TS SDK. Separate Phase B SDK-asymmetry finding, not addressed
  in this release.
- **`httpStatus` cross-SDK drift on pre-existing 2xxx auth codes.**
  10 of 14 existing 2xxx codes diverge between this SDK and
  `ospp-sdk-php` v0.5.x on `httpStatus`:
  - `2000 AUTH_GENERIC`, `2002 OFFLINE_PASS_INVALID`,
    `2003 OFFLINE_PASS_EXPIRED`, `2004 OFFLINE_EPOCH_REVOKED`,
    `2005 OFFLINE_COUNTER_REPLAY`, `2006 OFFLINE_STATION_MISMATCH`,
    `2007 COMMAND_NOT_SUPPORTED`, `2013 BLE_AUTH_FAILED` — this SDK
    maps these to `401` / `403` / `501` explicitly; `ospp-sdk-php`
    falls through to `500` via its `match` default.
  - `2001 STATION_NOT_REGISTERED` — this SDK maps to `401`;
    `ospp-sdk-php` maps to `422`.
  - `2008 ACTION_NOT_PERMITTED` — this SDK maps to `403`;
    `ospp-sdk-php` maps to `401`. (Spec §2.4 lists 2008 under both
    401 and 403, so this divergence has a spec-level ambiguity behind
    it.)
  Only 4 of 14 agree (`2009`/`2010`/`2011`/`2012` — all 401). Scope
  of this drift extends beyond 2xxx (cross-SDK parity on 3xxx/4xxx/
  5xxx/6xxx not audited yet). Closing this drift requires a dedicated
  SDK-metadata parity sprint that: (i) audits cross-SDK on the entire
  enum; (ii) chooses the canonical value per code (spec doesn't
  specify for most); (iii) potentially upgrades `07-errors.md §2.4`
  from an indicative "Typical Error Codes" table to a normative
  exhaustive mapping. Tracked separately; NOT in scope for v0.5.2.

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
