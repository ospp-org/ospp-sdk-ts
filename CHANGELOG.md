# Changelog

## Unreleased — `.spec-ref` v0.31.0 → v0.32.0

**Not a release, and unlike the sibling this one carries no behaviour change at all.** No version
is cut and none is needed: spec `0.32.0` moves **0** of the 86 schemas and **0** of the 334
conformance vectors, so there is nothing to re-vendor beyond the corpus README banner that moves
with the spec *version* rather than with the vectors. `@ospp/protocol` stays at **0.29.0** on npm.

> ### The marker moves for hygiene, not repair — and the gates were asked to prove it.
>
> Measured, not assumed. Moving `.spec-ref` alone turned exactly **two** of the eight gates red,
> and they named exactly the three files that had to follow:
>
> | gate | what it named |
> |---|---|
> | `check:vector-corpus` | `src/test-vectors/README.md` — the banner, the only byte of the corpus that differs between the two tags |
> | `check:doc-claims` | `README.md` line 3, and `src/enums/SessionEndReason.ts`'s *as-of* claim |
>
> The other six stayed green through the move, which is the measurement: `check:error-registry`,
> `check:config-registry`, `check:crypto-vectors`, `check:action-registry`, `check:vector-types`
> and `check:recommended-action` all compare content, and no content moved. Vendored corpus at
> both tags: **163 valid + 171 invalid = 334**, byte-identical either way.

### Changed — the marker, and the three claims derived from it

- `.spec-ref` **v0.31.0 → v0.32.0**.
- `src/test-vectors/README.md` re-vendored from spec `v0.32.0` — a one-line banner.
- `README.md` line 3, and `src/enums/SessionEndReason.ts`'s *"7 values as of spec 0.31.0"* → `0.32.0`.
  The count itself is unchanged and was re-derived from the schema at `v0.32.0` rather than carried:
  the `reason` enum is still **7**, because `0.32.0` considered widening it and **refused with the
  cost written down**. The *"7 since spec 0.31.0 added Inactivity"* note in the tests is a statement
  about history and stays as it is.

### Unchanged — `2008` was already right here, and that is now decidable

`07-errors.md` §2.4 listed `2008 ACTION_NOT_PERMITTED` under **both** `401` and `403` in all 49 spec
tags from `v0.1.0-draft.1` on — the only one of that table's thirty codes to appear twice. §4.4
declared the table illustrative and expressly permitted it, so this SDK's `403` and `ospp-sdk-php`'s
`401` were **both conformant and neither refutable**. Spec `0.32.0` gave the licence a condition — a
code listed twice MUST have a registry entry naming the discriminator — and `2008`'s entry names one
condition, which is `403` by construction. The `401` row was unselectable and is gone.

**No value moves here.** `OSPP_ERROR_REGISTRY[2008].httpStatus` was already `403`, and the §2.4
fixture in `tests/enums/OsppErrorCode.test.ts` already asserted `[2008, 403]`. Re-derived from the
table at both tags: **31 pairs at `v0.31.0`, 30 at `v0.32.0`**, the single removed pair being
`2008 → 401`, and the fixture is set-identical to the `v0.32.0` table. What changed is the note above
that fixture, which told the reader the spec listed the code twice — true when written, false now.

**The sibling is the one that moves.** `ospp-sdk-php` ships the `401 → 403` correction in its next
release. **That does not oblige a tag here**: ADR-001 lockstep pairs the two SDKs on the *spec* they
vendor, and nothing in either repository compares the two package versions — no script, no CI job, no
assertion. Cutting `0.30.0` here to match would publish a version whose entire diff is a version
string. The pin this package advertises is `.spec-ref`, and it is now correct.

---

## 0.29.0 — 2026-09-04

**SDK-pair release against spec `v0.31.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md)).
`.spec-ref` moves **v0.29.0 → v0.31.0**, taking up **two** spec minors.

> ### Five spec releases moved zero schema bytes. That run ended here.
>
> `v0.26.0` through `v0.29.0` moved **no** vendored schema and **no** vendored vector, so the
> cascade for four consecutive syncs was a one-line marker bump and the byte-identity gates
> could not have told you either way. `v0.30.0` and `v0.31.0` move schemas, so this sync is a
> **full re-vendor** and both identity gates were **RED** on arrival. That is them working.
>
> Measured against the spec at both tags rather than read from its release notes:
>
> | | moved | denominator |
> |---|---|---|
> | schemas | **3** | 86 |
> | conformance vectors | **0** | 334 |
> | crypto vectors | **0** | 5 in spec (this SDK vendors a subset) |
> | config keys | **+1** | 28 → 29 |
> | error codes | **0** | 118 |
>
> The vector corpus moved **zero bytes of vector**, and the corpus gate still went **RED** —
> on `test-vectors/README.md`, whose banner reads `OSPP Version: 0.29.0` upstream at `0.31.0`.
> That file is in the diff deliberately: it is the only artefact in the corpus that moves with
> the spec *version* rather than with the vectors, and it is what makes the gate discriminate
> one `.spec-ref` value from another. A corpus gate that stayed green here would be the
> pre-`v0.27.0` gate, which reported `OK` through twelve minors of README drift.

> ### The numbers cross wider, and that is the design.
>
> This release is `0.29.0` and it pins spec `v0.31.0` — an offset of **−2**. The offset is not
> fixed and not permanent: it was **0** at `0.27.0`/`v0.27.0`, **−1** at `0.28.0`/`v0.29.0`,
> and **−2** here. It has changed at three consecutive releases, which is exactly why the two
> numbers **must not be compared**.
>
> The number is taken from this package's own line — `0.28.0` plus a MINOR — and never from the
> spec's. Choosing `0.31.0` to match the pin would derive one number from the other, the exact
> reading trap [`VERSIONING.md`](https://github.com/ospp-org/spec/blob/main/VERSIONING.md#the-two-lines-have-crossed-and-they-will-not-uncross)
> forbids. **`.spec-ref` remains the only source of truth.**
>
> Swept again, as a set rather than a sample: **nothing compares the two numbers.** Every
> tracked file under `scripts/`, `.github/`, `tests/` and `src/` was swept — the denominators
> are in the release notes below — and of the 14 files that name `.spec-ref` in each repo, not
> one reads a spec version and compares it ordinally to this package's. The spec's **MUST NOT**
> against introducing such a comparison is intact, and this release does not add one.

> **Both SDKs changed at this release.** Neither is a no-op version bump taken only to keep the
> pair in lockstep: `ospp-sdk-php` and this package each re-vendored three schemas, each took
> the same three registry transcriptions, and each fixed a *different* `3003` defect. Where one
> of the pair has nothing to ship this note says so; this time it does not apply.

### Re-vendored — spec `v0.31.0`, 3 schemas of 86

`src/schemas/` is a byte-mirror; the three that moved:

- **`mqtt/session-ended-event.schema.json`** — `reason` enum **6 → 7**, adding `Inactivity`.
  Two `description` cells also lost their `—`/`§` escapes for literal `—`/`§`.
- **`mqtt/boot-notification-request.schema.json`** — new OPTIONAL property `messageSigningMode`
  (`All` | `None`). `bootReason`'s description widened to cover a TriggerMessage-induced Boot;
  **the enum did not change**.
- **`provisioning-response.schema.json`** — `mqttConfig.keepAliveSeconds` description only; it
  contradicted the `required` array three lines above it. No constraint moved.

**The three files carry 16 of the 334 vectors**, and **all 16 still validate** — run, not
reasoned. A widening cannot break a positive vector; it *can* break a negative one by admitting
a payload that was refused. The two at risk use `"UserStopped"` and `"unknown_reason"`, neither
admitted by the widened enums, and `Inactivity`/`messageSigningMode` appear in **0** of the 339
vector files upstream (literal match; positive control on `bootReason` returns 10).

### Added — `messageSigningMode` on `BootNotificationRequest`

The hand-written payload types sit outside the byte-identity gate, and the schema just gained a
property this one did not have — the drift `check:vector-types` exists to catch, invisible to it
here only because no vector carries the field yet. Typed `messageSigningMode?: MessageSigningMode`
against the existing `'All' | 'None'`, OPTIONAL as the schema has it.

It is deliberately **not** part of `capabilities`: that object is four booleans describing what a
station *supports*; this is configuration state describing what it is *doing*. It rides
BootNotification REQUEST because that message is one of the three structural exemptions from
message signing (06-security.md §5.6), and so the only message that still arrives when station
and server disagree about the mode — every other channel that could report it is among the 44
signed types.

### Changed — three hand-transcribed registry values the schemas do not carry

1. **`SessionEndReason` 6 → 7** — `INACTIVITY = 'Inactivity'`, the `SessionTimeout` idle stop.
   Billed **pro-rata**, the same shape as `Local`, *not* a zero-billing reason. **MeterValues do
   not reset the timer.**
2. **`ConfigKey` 28 → 29** — `STATION_IDENTITY_CERTIFICATE`, registered by spec `0.30.0`:
   string, no default, **W**, Dynamic, **Security**.
3. **`3003 SERVICE_UNAVAILABLE`: HTTP `503` → `409`.**

### Fixed — `3003` said `503`, and the sibling said `500`

`3003` appeared in **no row** of §2.4's status table until spec `0.30.0`, and the three
implementations that had to answer anyway did not agree: the reference server said `503`, this
SDK said `503`, and `ospp-sdk-php` had **no arm at all** and fell to its `default => 500`. A
caller branching on the status for retry or alerting got a different answer per library.

`409` because the name misleads: `3003` says a declared service is not deliverable **on that bay
right now** — a fact about the addressed resource. `503` asserts the *server* is unavailable,
which is false here and invites a retry of the whole endpoint rather than a different bay.

**The `spec §2.4 explicit HTTP status mappings` list is the reason this survived.** It is
hand-maintained, and it had drifted **eleven codes** behind the table it claims to mirror —
`4010`, `4017`, `2019`, `3003`, `3019`, `4015`, `6008`, `4016`, `4020` were all named upstream
and absent here. It is now transcribed **in full, 30 codes**. The other ten were already correct;
only `3003` was wrong, which is exactly why a sample missed it.

> `2008 ACTION_NOT_PERMITTED` is listed by the spec under **both** `401` and `403`. This SDK
> answers `403` and `ospp-sdk-php` answers `401`; both satisfy the table as written and neither
> is falsifiable until the spec drops a row. **Pinned in both, not aligned**, so the
> disagreement stays visible rather than being settled by whoever edited last.

### Fixed — two recommended actions the spec re-worded, caught by the gate

The `recommendedAction` gate checks coverage and structure and never bytes, because §1.4 forbids
asserting byte-identity. **It caught this move**, four findings before the fix and none after:
three CODE-REF on `1005` (the cell now cites `1005`, `1007`, `2001`) and one DISCRIMINATOR on
`3003` (now a branching entry on `details.cause`). Both arms stay inside Appendix C's 1..500.

### Fixed — a test that could not fail

`9 + 6 + 6 + 4 + 3 = 28` asserted an arithmetic identity and never touched the registry, so it
stayed **green** when the registry went to 29 keys. It now sums the actual per-profile counts and
compares them to the actual key count. Mutation-checked: adding a bogus key turns it red.

### Verification — mutation, not assertion

Each defect was injected and the job that owns it had to go red. **12 of 12 discriminated**,
including the two cross-injections this release exists to prevent: this SDK's `3003 → 503`
injected into `ospp-sdk-php` goes **RED** under `phpunit`, and `ospp-sdk-php`'s `3003 → 500`
injected here goes **RED** under `npm test`.

> One case stated precisely: dropping `STATION_IDENTITY_CERTIFICATE` from **the enum** leaves
> `check:config-registry` **green**, because that gate reads `CONFIG_KEY_REGISTRY`'s metadata and
> not the enum, and the registry entry survives with its `key` field intact. `tsc` and two suite
> assertions catch it, and both run before that gate's job, so nothing reaches a green CI — but
> the gate alone is blind to an enum/registry disagreement, and that is recorded rather than
> left for the next reader.

---

## 0.28.0 — 2026-09-04

**SDK-pair release against spec `v0.29.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md)).
`.spec-ref` moves **v0.27.0 → v0.29.0**, taking up **two** spec minors. `v0.28.0` was
vendored on `main` after the last release and never tagged, so it ships here.

> ### The numbers cross again, and this release is where the last one's coincidence ends.
>
> This release is `0.28.0` and it pins spec `v0.29.0`. The previous release was `0.27.0`
> pinning `v0.27.0` — equal numbers, and its own note said plainly that the equality was a
> coincidence and would not survive. It did not: the offset is **−1** here.
>
> The number was taken from this package's own line — `0.27.0` plus a MINOR, because a spec
> take-up bumps a minor even when it changes no code — and not from the spec's. Choosing
> `0.29.0` to match the pin would have been deriving one number from the other, which is the
> exact reading trap [`VERSIONING.md`](https://github.com/ospp-org/spec/blob/main/VERSIONING.md#the-two-lines-have-crossed-and-they-will-not-uncross)
> exists to warn against. **`.spec-ref` remains the only source of truth.**
>
> Swept again at this release: **nothing compares the two numbers.** No script in `scripts/`,
> no job in `.github/workflows/`, no assertion in `tests/` reads a spec version and compares
> it ordinally to this package's. `publish.yml`'s guard compares `package.json` to the **git
> tag**, which is this line against itself. The one new gate below reads `.spec-ref` to find a
> spec checkout and never looks at a version at all. The spec's **MUST NOT** against
> introducing such a comparison is intact.

### Added — `RECOMMENDED_ACTION` and `recommendedAction()`, covering all 118 registry codes

This SDK carried **no corrective actions at all**. `OsppErrorMeta` has `code`, `text`,
`severity`, `recoverable`, `httpStatus` and `category`, and no member for the registry's
*Recommended Action* column; nothing exported it and nothing missed it. `ospp-sdk-php`
carried **11 of 118**, and that 11 had been read once as the spec registry being incomplete.
It is not, and the measurement says so at three consecutive tags:

| spec tag | §3 rows | rows with an EMPTY *Recommended Action* cell |
|---|---|---|
| `v0.27.0` | 118 | **0** |
| `v0.28.0` | 118 | **0** |
| `v0.29.0` | 118 | **0** |

The registry has been complete throughout. The hole was a **transcription hole on the SDK
side of the wire** — total on this one — and nothing could see it: `check:error-registry`
compares `errorText`, `severity` and `recoverable` and stops at the column before this one.

New module `src/enums/RecommendedAction.ts`, exported from the package root:

- `RECOMMENDED_ACTION` — `Readonly<Record<OsppErrorCode, string>>`, 118 entries.
- `recommendedAction(code)` — returns `string`, not `string | undefined`. The record is
  total over the enum, which is what the new gate enforces, so a caller emitting the REST
  Error Object (§2.4) — where `recommendedAction` is **REQUIRED** — never has to decide what
  to do with an absent value. A code outside the enum throws rather than returning a
  placeholder: §1.4 forbids substituting a generic string, and an invented one is exactly
  that.

It is a separate module rather than a seventh field on `OsppErrorMeta`, because the values
run to 494 characters and `meta(…)` is a positional helper — a seventh argument would have
made the registry unreadable to buy nothing.

The transcription rule is mechanical and stated so it can be repeated: take the registry
cell, flatten each Markdown link `[label](url)` to `label`, collapse runs of whitespace.
Nothing else. It was not invented for this release — it was **derived by measuring the 11
arms `ospp-sdk-php` already had**, 9 of which were byte-identical to their cell under exactly
that rule. Every cell fits the wire bound as written (longest **494** of Appendix C's 500),
so no shortening was needed anywhere and none was done.

### Added — `scripts/check-recommended-action.ts`, `check:recommended-action`, and the `recommended-action` CI job

The gate that keeps the hole shut. **It is not a diff, and it must not be one** — that is
the whole of its design, and §1.4 is explicit:

> Byte-identity is not achievable in any case, since translation is expressly permitted, so
> a conformance test **MUST NOT** assert it.

A gate written as a diff would break the section it exists to enforce. It would also be
wrong in practice, and both halves of that were **measured on the 11 arms the PHP SDK
already had**, which had drifted in two opposite ways:

| Code | What it did | Conforming under §1.4? | A diff would have |
|---|---|---|---|
| `4020` | reworded to fit the 500-char bound; says exactly what the cell says | **yes** — shortening is permitted | **falsely failed** it |
| `4010` | said an absent `details.phase` means `retry` full stop | **no** — opposite recovery on the renewal path | caught it, indistinguishably from the false red |

A gate that cannot tell those two apart is not a gate. So this one asserts only properties
that **survive a translation**: coverage, no orphans, the 1..500 wire bound, distinctness
(how a generic substitution actually presents — it collapses many codes onto one string),
the placeholder §1.4 names by hand, the `details.<member>` discriminator a branching entry
must carry, a four-digit code the cell cross-references, and the **count of addressed
parties**.

**That last one was wrong in the first draft, and measuring is what found it.** It required
the literal label: `Station:` in the cell had to be `Station:` in the arm. Run against a
Romanian rendering of `4018` that keeps every protocol token, it **failed** — a conformance
test rejecting a translation, which is exactly the forbidden thing, arriving through a check
that never mentions bytes. Counting addressed *segments* instead passes the same translation
and still fails when a part is dropped. `Server/Operator:` is one segment, not two; `5017`
and `5024` are the rows that decide it.

`tests/enums/RecommendedActionGate.test.ts` proves the property rather than asserting it, by
mutating the **spec** side and leaving the shipped value alone: a cell rewritten end to end
in another language leaves the gate green, and a gate with any byte comparison in it cannot.
Five further mutations red it, each naming its own rule. Anti-vacuity is a test of its own —
an emptied registry must exit 1 with `parsed only 0 rows`, never *"all 0 codes agree"* — and
because the whole file **skips** without a spec checkout, and skips read as passes in a run
summary, it now **throws under `CI`** when `SPEC_REPO` is unset. The `test` job clones the
spec for it.

**The two gates are mirrors and were checked as such.** The same six mutations were run
against both, and both answered all six identically, down to the finding text.

### Known, measured, and not closeable by a gate

The new gate catches a **structural** drift and cannot catch a **semantic** one. `4010` is
the worked example: its stale text kept `details.phase`, kept `4015`, and addressed the same
parties, so every structural property survived while the instruction was the opposite of the
registry's. Injected back into both SDKs, both gates exit **0**; remove the discriminator
instead and both exit **1** and name it.

This is not an unfinished gate. Seeing that class would mean comparing the prose, and §1.4
forbids exactly that. All 118 values are currently the registry cell under one mechanical
rule, so at this release drift is impossible by construction rather than by inspection —
**re-transcribing rather than hand-editing at each spec sync is what preserves that.** A
deliberately reworded value leaves the protection and rejoins the class above.

Adding a byte comparison with an exemption list was considered and rejected: it reintroduces
the forbidden assertion behind a list, and the list becomes the place a translation goes to
be argued about. `ospp-sdk-php` records this as an **OPEN** entry in its `KNOWN-ISSUES.md`;
this repository has never had that file, so it is recorded here and in the header of
`scripts/check-recommended-action.ts`.

### Changed — sync to spec `v0.29.0`

**Nothing on the wire moved across either minor.** Measured by re-vendoring the whole of
`schemas/` and both vector buckets from the `v0.29.0` tree and letting `git` report what
changed — not by reading the spec's release notes:

| Artefact | `v0.27.0` | `v0.28.0` | `v0.29.0` |
|---|---|---|---|
| schema files | 86 | 86, byte-identical | 86, byte-identical |
| conformance vectors | 163 valid + 171 invalid | identical | identical |
| error codes | 118 | 118 | 118, same `text`/`severity`/`recoverable` |
| config keys | 28 | 28 | 28, same type/default/access/mutability/profile |

**So no payload type moves either.** Nothing under `src/types/` changes, and `OsppErrorCode`,
`ConfigKey`, all six state machines and every schema are untouched.

Exactly **three files** move in this repository, and two of them are the spec re-stamping its
own version banner:

- `.spec-ref` — `v0.28.0` → `v0.29.0`
- `src/test-vectors/README.md` — the corpus banner, `0.28.0` → `0.29.0`
- `tests/crypto/fixtures/canonical-form.json` — **one line**, and no vector value:
  `specSection` changes from `06-security.md §4.8.1 (lines 677-688)` to
  `§4.8.1 (Algorithm), §4.8.2 (worked example)`. The `vectors` array hashes identically at
  both tags (17 vectors, same SHA-256), so the file's ORACLE is untouched — a line-number
  citation was replaced by a section citation.

`schemas/README.md` is the only artefact under the spec's `schemas/` that changed, and it is
one of the two files this SDK does not vendor (the other being its own `SchemaPath.ts`).
Both stay excluded, by name, in the `schemas` job's `--exclude` arguments.

### Unreleased work that ships here

The tamper-rejection conformance suite landed on `main` after `0.27.0` and was never tagged:
38 tests over 12 vendored vectors and 8 crypto surfaces, proving this SDK **refuses** a
tampered signature rather than only verifying one it produced itself. `check-vector-corpus.sh`
was widened in the same commit so that `crypto/`, excluded from the whole-directory diff
because this SDK vendors only a subset of it, is no longer thereby *unchecked*.

### Fixed — `publish.yml` ran `npm test` without the inputs `ci.yml` had been given

Found by the `v0.28.0` tag push itself. `ci.yml`'s `test` job was given the spec clone
the new gate test needs; `publish.yml`, which re-runs the same suite as reproducibility
insurance before publishing, was not. The tag built, tested **39 of 40 files green**, and
died on the fortieth — the gate test throwing rather than skipping, which is precisely
the behaviour it was given. The tag was moved to the fix rather than burnt for a `0.28.1`,
because the lockstep number is shared with `ospp-sdk-php` and nothing had been published.

The durable half: **two workflows each run `npm test` and each needs the same inputs**, and
a step added to one and not the other is a difference no push to `main` can find — only a
tag push runs `publish.yml`. A skipped test would have hidden it; a thrown one did not.

### Verified at this release

- **12 gates green**, 6 in each SDK, against a local `v0.29.0` checkout.
- **1123 tests across 40 files** (`vitest run`); `tsc -p tsconfig.test.json` clean; build clean.
- **6 mutations** run against both SDKs' gates, which answered all six **identically** —
  including the one that must stay green.

---

## 0.27.0 — 2026-08-30

**SDK-pair release against spec `v0.27.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md)).
`.spec-ref` moves **v0.25.0 → v0.27.0**, **skipping `v0.26.0`** — that tag exists upstream and no
SDK release ever pinned it, so two spec minors are taken up at once.

> ### The two numbers are equal this time, and that is a coincidence, not an alignment.
>
> This release is `0.27.0` and it pins spec `v0.27.0`. **Do not read the first from the second.**
> The previous release was `0.26.0` pinning `v0.25.0`; the one before it `0.25.0` pinning `v0.24.1`.
> The offset has been +1 minor twice and is **0** here, only because this SDK absorbs two spec
> minors in one release. It will move again the next time either line releases for a reason the
> other has no part in.
>
> [`VERSIONING.md`](https://github.com/ospp-org/spec/blob/main/VERSIONING.md#the-two-lines-have-crossed-and-they-will-not-uncross)
> says the two lines "are permanently offset and the offset is not fixed". As of this release the
> first half of that sentence is **false** and the second is why. That is worth saying plainly,
> because the sentence exists to warn against a *reading* trap — "a reader who does will pair an SDK
> with the wrong contract and get a green build for it" — and equal numbers are the most dangerous
> form of that trap, not the safest. Here the inference happens to land right. It is still an
> inference, and it was wrong at the last two releases.
>
> The number was chosen from this package's own line — a spec take-up bumps a MINOR, as at `0.18.0`
> which changed no code — and not from the spec's. Picking `0.28.0` to preserve a gap would have
> been deriving one number from the other just as much as picking `0.27.0` to close one.
>
> **`.spec-ref` remains the only source of truth**, and it is enforced byte-for-byte rather than
> ordinally. Swept again at this release: **nothing compares the two numbers.** No script in
> `scripts/`, no job in `.github/workflows/`, no assertion in `tests/` reads a spec version and
> compares it to this package's. `publish.yml`'s guard compares `package.json` to the **git tag**,
> which is this line against itself. The widened corpus gate below now diffs a vendored file that
> *contains* the spec's version banner — that is byte-identity against the spec tree, not an ordinal
> comparison of two version lines, and it reads nothing from `package.json`. The spec's **MUST NOT**
> against introducing a comparison is intact.

### Changed — sync to spec `v0.27.0`

**Nothing on the wire moved across either minor.** Measured against the vendored tree rather than
inherited from the spec's own *"no SDK re-vendor is required"*:

| Artefact | `v0.25.0` | `v0.26.0` | `v0.27.0` |
|---|---|---|---|
| schema files | 86 | 86, byte-identical | 86, byte-identical |
| conformance vectors | 163 valid + 171 invalid | identical | identical |
| error codes | 118 | 118, same `text`/`severity`/`recoverable` | 118, same |
| config keys | 28 | 28, same type/default/access/mutability/profile | 28, same |

Upstream, `git diff --stat v0.25.0..v0.27.0 -- schemas/ conformance/test-vectors/` is **two README
banner lines and nothing else**.

**So no payload type moves either — and that is the difference from the last sync.** At `v0.25.0`
three schemas drifted and two of them had a hand-written type behind them, so
`UpdateServiceCatalogResponse` and `OfflineAllowance` had to follow. Here **nothing under
`src/types/` changes**, `OsppErrorCode`, `ConfigKey`, all six state machines and every schema are
untouched.

`v0.26.0` closed six obligations no implementation could satisfy — the server-originated
SecurityEvent form, Heartbeat's four impossible error codes, the topology comparison's unnamed
referent, a `programNumber` drift routed to a code that cannot carry it, `1006`'s single prescribed
action for two paths, and a decommissioning cause the spec had already declared out of scope. Every
one is resolved in **prose**, by scoping or by naming a referent. Not one widened a schema, and the
one closed-set change in either minor — `2015` added to AuthorizeOfflinePass's row in the §4.1
action→code map — has no surface here, because this SDK models no such map.

### Fixed — the corpus gate was itself the hand-maintained list it warns against

`scripts/check-vector-corpus.sh` looped `for bucket in valid invalid`. Two names, written by hand,
and everything else in the corpus directory was outside the comparison. What was outside it was
`README.md`, which the spec re-stamps with its own version on every release and **which this SDK had
never vendored at all**.

`ospp-sdk-php` *had* vendored it, and its identically-shaped gate let it rot to `OSPP Version:
0.15.0` against an upstream `0.27.0` — twelve minors — while printing `OK — vendored conformance
corpus byte-identical to spec` on every run. Here the file was simply absent, which the same loop
could not see either. Both scripts' own headers three lines above the loop already said not to do
this: *"Do NOT narrow this to a hand-maintained file list — a list is a second place to forget, and
it fails silently by going green."* So does the spec's KNOWN-ISSUES entry that asked for this gate,
in the sentence that specified it.

Now one `diff -rq --exclude=crypto` over the whole directory, and **the README is vendored**, so the
two SDKs vendor the same tree. `crypto/` is the single exclusion, stated as an argument rather than
by omission — it lives under `tests/crypto/fixtures/` here and `check-crypto-vectors.sh` pins it by
name.

`src/test-vectors` is not published (`files` is `["dist","src/schemas"]`), so this adds nothing to
the package. `SchemaValidator.test.ts` discovers only `valid/` and `invalid/`, so a file at the
corpus root is invisible to it — 1078 tests and the 61-unmapped-BLE assertion are unchanged.

**What the widening buys is discrimination, not tidiness.** That README is the only vendored artefact
in this corpus that moves when the spec *version* moves and the vectors do not — and the vectors did
not move across either minor. So until this release **no gate in this repository could tell one
`.spec-ref` value from another**: the marker was carried by the commit alone. Measured on identical
inputs, the vendored README at `v0.27.0` against the spec tree extracted at `v0.25.0`:

- **old gate** — `rc=0`, `OK — vendored conformance corpus byte-identical to spec v0.27.0`. A false
  claim, made by name.
- **new gate** — `rc=1`, `Files .../README.md and .../README.md differ`.

A marker bumped without a re-vendor, and a re-vendor without a marker bump, were both green before
and are both red now. `ospp-sdk-php` was given the same two runs and answers identically; each
mutation was reverted after measuring.

### Unchanged, and deliberately — the two revocation settings

Spec `v0.27.0` makes certificate-revocation checking at the broker a **MUST**
([`06-security.md` §2.1.1](https://github.com/ospp-org/spec/blob/main/spec/06-security.md#211-revocation-checking))
and names two settings that bound it:

| Setting | Type | Default | Range |
|---|---|---|---|
| `CertificateRevocationMaxAgeSeconds` | integer | `86400` | `3600`–`604800` |
| `CertificateRevocationGraceSeconds` | integer | `3600` | `0`–`86400` |

They are **broker configuration and deliberately outside the Chapter 08 registry**. §1.1 defines
that registry as the *station's* key-value store and §1.5 makes every key of a required profile a
station conformance obligation; no station holds either setting, no OSPP message carries either, and
a station asked for one could answer only `NotSupported`. Registering them would oblige every
station to implement a key it cannot act on. **`ConfigKey` stays at 28 members.**

Proven rather than asserted, because a boundary held by prose is held by nothing.
`CertificateRevocationMaxAgeSeconds` was added to the enum and to `CONFIG_KEY_REGISTRY` with
consistent metadata — `tsc` clean at 29 entries, so that the only thing left to fail was the spec
comparison — and `npm run check:config-registry` exited `1` with
`CertificateRevocationMaxAgeSeconds: in CONFIG_KEY_REGISTRY, MISSING from the spec`. The existing
gate already refuses the boundary in both directions; a dedicated guard would have been a second
place to forget. The mutation was reverted.

### Unchanged — `1004 CERTIFICATE_ERROR` keeps four causes, and the fifth was refused on purpose

`v0.27.0` defines **two distinct revocation refusals** and routes them to different places:

| Condition | Broker refuses at | Station sees |
|---|---|---|
| The certificate **is** revoked | the TLS handshake | `1004` with `details.cause: "revoked"` — keep credentials, stay off, alert |
| Revocation status **cannot be established** and the grace has expired | the MQTT CONNECT, non-zero CONNACK (`0x87` RECOMMENDED) | a reason code — log it and retry with backoff |

The second gets **no fifth `details.cause`**: it is a property of the broker rather than of the
certificate, and it refuses before any OSPP message exists in either direction. The spec's reasoning
is that routing it through `1004` — whose non-expired branches are `recoverable: false` and say
*stay off the broker and alert the operator* — would take a fleet off on a transient list outage and
leave it off, the outage the grace period exists to prevent, produced by the mechanism meant to
prevent it.

Nothing follows for this SDK, and that is a measurement rather than an assumption: it models no
`details.cause` discriminator and no CONNACK reason code. `connection-lost.ts` carries a
single-member `reason: 'UnexpectedDisconnect'` and nothing maps a CONNACK byte to an error code, so
there is no set here to keep closed and no mapping that could send a non-zero CONNACK to `1004`.
`1004` remains `Critical`, `recoverable: false`, and all 118 registry rows still agree with the spec
field by field.

### Gates

All five green against spec `v0.27.0`: schemas (86 files), conformance corpus (163 + 171 + README),
crypto corpus (4 files), error registry (118 codes), config registry (28 keys, 5 profiles, 28
profile comparisons). vitest **1078 tests / 38 files**, `tsc -p tsconfig.test.json` clean, build
clean — all identical to the pre-sync baseline.

---

## 0.26.0 — 2026-08-20

**SDK-pair release against spec `v0.25.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md)).
`.spec-ref` moves **v0.24.1 → v0.25.0**.

> ### The version lines have crossed, and the gap widens here on purpose.
>
> This release is `0.26.0` and it pins spec `v0.25.0`. The previous one was `0.25.0` pinning
> `v0.24.1`. The two numbers are offset, the offset is not fixed, and **neither is derived from the
> other** — [`VERSIONING.md`](https://github.com/ospp-org/spec/blob/main/VERSIONING.md#the-two-lines-have-crossed-and-they-will-not-uncross)
> says so at the tag. Do not read `0.26.0` as "spec 0.26"; read `.spec-ref`, which is the only
> source of truth and is enforced byte-for-byte rather than ordinally.
>
> Swept at this release, in this repository: **nothing compares the two numbers.** No script in
> `scripts/`, no job in `.github/workflows/`, no assertion in `tests/` reads a spec version and
> compares it to this package's. `publish.yml`'s guard compares `package.json` to the **git tag**,
> which is this line against itself and is the correct shape. The spec swept the same question at
> `v0.25.0`, found the same answer, and wrote a **MUST NOT** against introducing a comparison.
> Verified here rather than inherited from that sentence.

### Added — the corpus that decides what this SDK accepts had no gate

`src/schemas/` has been byte-gated since v0.8.0 and `tests/crypto/fixtures/` since 0.14.0. The
**conformance corpus** — 334 files at spec `v0.25.0` — had nothing. It was re-vendored by hand on
every sync and its correctness rested on the maintainer having copied the right tree.

The blindness is structural. `SchemaValidator.test.ts` validates whatever vectors are present
against whatever schemas are present, so a vector edited in place is locally consistent and
upstream-wrong at the same time. **Measured, not argued:** flipping ONE BYTE of
`valid/core/boot-notification-response-full.json` left **1067/1067 tests passing** and turned the
new gate red, naming the file.

`scripts/check-vector-corpus.sh` + `npm run check:vector-corpus` + the `vector-corpus` CI job.
Three mutations, each required to name the offender: one byte changed → `DRIFT`; a vector deleted
→ `Only in <spec>`; a vector added → `Only in <vendored>`.

Scope is a whole-directory diff on `valid/` and `invalid/`, deliberately: this SDK vendors the
complete sets, so the directory form also catches a vector deleted here or added upstream — which
a hand-maintained file list cannot, and which no count could ever have seen.

### Changed — sync to spec `v0.25.0`

**Three schema files moved, not two.** The third is a loosening and is the easy one to miss:

- `mqtt/firmware-status-notification.schema.json` — `progress` is now `false` on `Downloaded`,
  `Installed` and `Failed`; `errorText` is REQUIRED on `Failed` and forbidden on the other four.
  Three `allOf` branches, the shape `diagnostics-notification.schema.json` has carried since
  `0.23.0`. Rule 3 had said *"omitted **or set to `0`**"* — two spellings of one absence differing
  only in bytes.
- `mqtt/update-service-catalog-response.schema.json` — the `Accepted` arm now requires
  `previousCatalogVersion`.
- `common/offline-pass.schema.json` — `allowedServiceTypes` leaves `required`. Step one of a
  two-step withdrawal; accepted-and-ignored.

**Corpus: +5 invalid, 2 valid changed, 0 removed. 163 valid + 171 invalid = 334.** Measured
against the vendored tree, not inherited from the spec's verification report — which reports 334
vector checks in its Category 8, and the two agree.

### Changed — payload types, which is where this SDK differs from its sibling

`ospp-sdk-php` hand-writes no payload types, so two of the three schema moves have a surface here
and none there.

- **`UpdateServiceCatalogResponse.previousCatalogVersion` — optional → REQUIRED** on the `Accepted`
  arm. **Breaking** for a consumer constructing that shape. It is `string` and not optional
  because the **empty string** is the conforming value for a station that has never held a catalog:
  absent and `""` are two different statements on the wire, and only one of them is allowed on an
  `Accepted`.
- **`OfflineAllowance.allowedServiceTypes` — required → optional.** A widening, which is what step
  one of the withdrawal is: servers **MUST NOT** issue it, receivers **MUST** still accept a pass
  that carries it.
- **`FirmwareStatusNotificationPayload` — docblocks, not shape.** The type stays flat with
  `progress?`/`errorText?`, matching `DiagnosticsNotificationPayload`, whose identical conditions
  landed in `0.23.0`. Its documentation had said the conditions were *"prose only"* and that *"the
  schema does not require it"* — **both true when written and false as of `v0.25.0`**. Neither
  firmware repair invents a form the twin does not have.
- **`OfflineConstraints.stationOfflineWindowHours`** is documented as a **monotonic** elapsed
  duration from the last successful MQTT connection, per `06-security.md` §6.1.1 check #2. Offline,
  both clock sources are unreachable and `5106` cannot fire, so a consumer measuring this on a wall
  clock gets it wrong exactly when it matters.

### Added — controls, because moving a `?` proves nothing by being accepted

Every shape a required field accepts is also accepted by the optional version, so the positive
cases cannot tell the two apart. Both directions are pinned:

- **`@ts-expect-error` on `{ status: 'Accepted' }`** — the refusal proof. Reverting
  `previousCatalogVersion` to optional fails `npm run typecheck` with **TS2578 "Unused
  '@ts-expect-error' directive"**. Verified by mutation, not asserted. The response union was
  imported by `payloads.test.ts` and exercised by **nothing** before this.
- **A pass whose allowance omits `allowedServiceTypes` now compiles** — the widening proof —
  **beside** one that carries it, which must still be accepted. A control that only proved the new
  shape would read as if the old had been dropped.

`check-vector-types.mjs` gains the two payloads whose schemas moved, per its own rule (*"adding a
vector is one line in VECTORS; do that when a payload type changes"*): both catalog responses and
two firmware notifications spanning both new conditionals — the `Failed` carrying `errorText` and
no `progress`, the `Downloading` carrying neither. **12 vectors → 16.**
`FirmwareStatusNotificationPayload` had no vector coverage at all. Proved by mutation: dropping
`errorText?` fails the gate with **TS2353** naming the field.

### Mutation proof, run in both SDKs

The `v0.24.1` schema injected under the `v0.25.0` corpus. `ajv` here and `opis/json-schema` there
discriminate **identically, by name** — which is the property that matters, because a conditional
one engine honours and the other ignores is exactly how two SDKs disagree about the wire with both
suites green:

| injected | result |
|---|---|
| old firmware schema | 3 negatives stop being refused — the same 3 in both |
| old catalog schema | 1 negative stops being refused — the same 1 in both |
| old offline-pass schema | **neither SDK notices**; both stay fully green |

The third row is **intent, not a hole**. `06-security.md` §6.1.1 states that every vector keeps the
member deliberately: it sits inside the signed body, so removing it means re-signing the fixture
for no gain, and the corpus moves in step two with the deletion. Step one is accepted-and-ignored,
so a pass carrying it MUST still validate — green is the correct reading. On this side the widening
does have an observable control, the type test above; `ospp-sdk-php` has only the byte gate,
because it has no such type.

### Changed — the corpus count literal is replaced, not bumped

`toBe(329)` was a **second copy of a fact about the corpus** rather than a check on it: nothing
derived it from the vendored tree, so a human bumped it on every sync and, when forgotten, the
failure landed on whoever re-vendored *correctly*. That test's own comment asked for exactly what
now replaces it. The `vector-corpus` gate pins WHICH vectors are here byte-for-byte; what remains
is an anti-vacuity floor, and it is deliberately **not** a count.

### Not changed — three items from `v0.25.0` with no surface here, each measured

- **`5103 STORAGE_ERROR` joins StartService's permitted set** (§4.2). **No per-message
  permitted-code model exists in this SDK.** `OsppErrorCode`'s metadata is per code, not per
  message; §4.2 is a table nothing here transcribes.
- **SecurityEvent `type` selection becomes two-step** (named → `51xx` → `5xxx`). **This SDK does
  not map code to type.** `SecurityEventType` is a twelve-member union and nothing derives one from
  an `OsppErrorCode`. The rule it replaces answered `5112` three times and eight Critical codes not
  at all — and this package implemented none of the three.
- **`5111 BUFFER_FULL` moves Warning → Critical in the profile table.** `ERROR_META` **already**
  says `'Critical'` for it, and `check:error-registry` compares against `07-errors.md` §3, which
  said Critical in both places. `start-service.md` §7 was the lone dissenter and nothing here read
  it. The value was right because the source was right.

### Fixed — a missing changelog entry, filled rather than only named again

**`0.24.1` was tagged, released and published with no changelog entry in either SDK.** The `0.25.0`
entry above **named** the hole and left it open; it is now written, dated as it was released and
marked as reconstructed.

That note also **miscounts what the release contained** — it says *"one `ConfigKey` default
moved"*, and **two** did, here and in `ospp-sdk-php`: `MaxOfflineTransactions` 50 → 1000 **and**
`OfflinePassMaxAge` 3600 → 86400. Corrected in the entry below.

Measured across both repositories, `git tag` against `^## ` headings — **three tagged releases in
this package have no entry**, and two remain unwritten:

| version | tagged | entry |
|---|---|---|
| `0.24.1` | 2026-08-18 | **written below at 0.26.0** |
| `0.6.1` | 2026-06-21 | still missing |
| `0.6.0` | 2026-06-20 | still missing |

`ospp-sdk-php` has the same gap plus `0.6.2`, which this package does have. The 0.6.x entries are
**named and left unwritten** rather than reconstructed from commit subjects two months after the
fact: an entry invented now would read exactly like one written then, and that is the property
worth not losing. `0.21.0` and `0.24.0` are **not** gaps — neither was ever tagged in either SDK,
and neither changelog claims them.

Suite: **1078 tests, 38 files**. `tsc --noEmit`, `npm run build`, and all six drift gates clean.

---

## 0.25.0 — 2026-08-19

**SDK-pair release against spec `v0.24.1`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). `.spec-ref` **does not move** — it stays `v0.24.1`,
the contract did not change, and the spec is not re-tagged to chase an SDK number.

**Both SDKs ship code in this release.** Neither side is here only to hold the number: the same
bridge lands in `sdk-ts` and `ospp-sdk-php`, and the same mutations were injected into both to
prove each one's gate discriminates. This is not a lockstep-alignment release and the entry would
say so if it were.

> ### ⚠ The firmware machine had no bridge to the wire, and its gap is the widest in the chapter.

`0.23.0` gave the diagnostics machine a wire ↔ machine bridge in both SDKs. The firmware machine
never got one, and deferring it was the risk: the two SDKs would each have grown a shape for it,
and this is the machine where the shapes could not have agreed.

Ten states, and a FirmwareStatusNotification carries **five** of them
(`05-state-machines.md` §6.6). The other five are **not one kind of thing**, and that is what made
this bridge different from the diagnostics one rather than a copy of it:

* **Four are unobservable.** §6.6: *"Four states have no notification value at all and are, from
  the server's side, unobservable… a server that models the station's ten states will hold four of
  them that nothing on the wire can ever set."* They are `Idle`, `Verifying`, `Verified`,
  `Rebooting`.
* **`Activated` is the fifth, and it is reported** — §6.6 maps it to BootNotification [MSG-001],
  *"not FirmwareStatusNotification"*.

So the "no notification value" set has **five** members and the "never observed" set has **four**,
and they differ by exactly one state. The diagnostics bridge had one non-reportable state (`Idle`)
and no such difference to carry, so `isReportableDiagnosticsState` answered both questions there.
Here one predicate answers one of them wrong whichever way it is written: a consumer that treats
`Activated` as unobservable throws away the only report a completed update ever gets, and one that
treats the four as observable waits for messages the protocol never sends.

### Fixed — the wire union was declared twice, and nothing reconciled them

`types/payloads/firmware-status-notification.ts` carried its own hand-written
`FirmwareNotificationStatus` union while `state-machines/FirmwareStateMachine.ts` carried the
`FirmwareState` union, in different files, with no file referencing both. This is the identical
drift the diagnostics bridge closed at `0.23.0`, left open on the machine where it mattered more.

`FIRMWARE_NOTIFICATION_STATUSES` is now declared **once**, next to the machine, and the payload
module re-exports the type instead of re-declaring it.

### Added — all re-exported from the package root

* `FIRMWARE_NOTIFICATION_STATUSES` / `isFirmwareNotificationStatus()` — the five schema values.
* `ReportableFirmwareState` — `Extract<FirmwareState, FirmwareNotificationStatus>`, derived from
  the wire list rather than re-listed, so the two cannot drift.
* `UnobservableFirmwareState` — `Exclude<FirmwareState, ReportableFirmwareState | 'Activated'>`.
  Derived, so it is five-minus-`Activated` **by construction** rather than by a second hand-kept
  list of four.
* `firmwareStateFromNotificationStatus()` / `firmwareStateToNotificationStatus()` /
  `isReportableFirmwareState()`. Nothing produces any of the four unobservable states from a wire
  value, and nothing produces `Activated` either — that one arrives on another message, and a
  bridge that yielded it from a FirmwareStatusNotification would be inventing a message.
* `isObservableFirmwareState()` / `firmwareStateObservedBy()` — the predicate the diagnostics
  bridge never needed. `firmwareStateObservedBy()` returns an `OsppAction` member rather than a
  string literal, so a rename of the action cannot leave the mapping pointing at a message that no
  longer exists.

### Added — the conforming notification sequence is not a walk of §6.3

This is the part that would have cost a consumer money, and it has no counterpart in the
diagnostics bridge at all. There, every edge of §8.3 runs between two states the wire carries, so
what a server observes IS a walk of the table and `canTransition` answers directly.

Here three of the thirteen edges run **through** unobservable states, so the wire **skips**:

```
station:  Downloaded -> Verifying -> Verified -> Installing
server:   Downloaded ------------------------> Installing
```

`Downloaded -> Installing` is not in §6.3 and **MUST NOT** be added to it — §6.6's silent interval
is where the SHA-256 and the ECDSA P-256 verification run over the whole image. A consumer that
fed the two arriving statuses into `canTransition` refused the update at the moment it started
installing. The same shape hides two more: `Downloaded -> Failed` (a checksum mismatch or a `5112`
invalid signature, reported from a state the server never saw the station enter),
`Installed -> Failed` (the watchdog, through `Rebooting`), and `Failed -> Downloading` — the
rollback edge, which like §8.4's `Uploaded -> Idle` has **no wire trigger and must not be waited
for**.

* **`observableFirmwareTargets(from)`** — the reportable states reachable by a path whose
  **intermediate** states are all unobservable. `Activated` is neither returned nor traversed: it
  is observable, so a server is told about it and must not have it inferred.
* **`applyFirmwareNotification(current, status)`** — advances a consumer's mirror from one
  arriving notification. A repeat of the state already held is a **progress report, not a
  transition**: `firmware-status.md` §5 rules 1--2 ask for one every 10% of `Downloading` and at
  four milestones of `Installing`, and §6.3 has a self-edge for neither. Same rule §8.4 states for
  the repeated `Uploading` stream, same resolution.

**A successful update ends in silence on this message.** `observableFirmwareTargets('Installed')`
is `['Failed']` and nothing else — the success branch is `Installed -> Rebooting -> Activated`,
and the news arrives as a BootNotification. A consumer waiting for a firmware status to tell it
the update completed waits forever.

### Gate — the pair SET, and no cardinal

`FirmwareCanonicalTable.test.ts` gains the bridge half, in the same file that already owns this
machine's edges. §6.3's closing paragraph — *"a conformance check that asserts a transition count
must assert 13; one that counts the rows of this table gets 14"* — governs the new pairs too, and
for the same reason: **a count cannot say WHICH pair moved.**

* The wire enum is read out of the vendored
  `src/schemas/mqtt/firmware-status-notification.schema.json`, not restated, so a spec change to
  it fails in the gate instead of being absorbed by a literal in it.
* All **50** `(held state × arriving status)` combinations are swept, each asserted one way or the
  other, so a pair that is neither permitted nor refused cannot exist. The sweep carries its own
  denominator: a run that iterated nothing fails.
* The pair list is the SAME list the `ospp-sdk-php` mirror of this file asserts.

**Proved by mutation, in both SDKs.** Three defects were injected into each package and each
package's gate was confirmed RED for the right reason, then reverted: conflating observability
with reportability (2 failures, both naming `Activated`); advancing with `canTransition` instead
of the observable closure (4 failures, naming `Downloaded → Installing` and `Failed →
Downloading`); and admitting a silent state into the wire enum (7 failures, naming `Verifying`).
A green suite either side of that is what the last two releases' worth of cross-SDK disagreements
were missing.

### Not changed here — two open items upstream, in `spec/profiles/device-management/firmware-status.md`

Reported, not fixed: both are the specification's. The payload type's doc comments now say so at
the point of use, because `progress?` and `errorText?` are optional here for a reason a consumer
should not have to guess.

* **`errorText` is unconditional on the firmware notification.** §5 rule 4 makes it a MUST on
  `Failed`, but `firmware-status-notification.schema.json` neither requires it there nor forbids
  it elsewhere. The diagnostics twin has **both** halves schema-enforced since `0.23.0`
  (`diagnostics-status.md` §5 rule 5, and its schema carries the two `if/then` clauses).
* **The progress rule is weaker there.** §5 rule 3 permits `progress` *"omitted **or set to
  `0`**"* on `Downloaded`, `Installed` and `Failed` — two spellings of the same absence, where
  `diagnostics-status.md` §5 rule 4 permits one (*"MUST be omitted"*) and the schema enforces it
  with `progress: false`. The firmware schema constrains `progress` on no status at all.

### Note — `0.24.1` shipped in both SDKs with no CHANGELOG entry in either

`v0.24.1` is tagged here (`a1e3536`) and on `ospp-sdk-php` (`9a71dfd`), and neither repository's
CHANGELOG has a heading for it — the entries below jump from `0.23.0` to this release. By
ADR-001's own definition that release is **not complete**: *"the CHANGELOG entry exists in both
SDKs under the same version header, naming the spec tag implemented."* What it contained, for the
record: `.spec-ref` **v0.23.0 → v0.24.1**, one `ConfigKey` default moved to follow spec `0.24.1`,
the one conformance vector that moved with it, and the `package.json` bump. No entry is back-dated
here; the hole is named rather than papered over.

## 0.24.1 — 2026-08-18

> **Entry reconstructed at `0.26.0`, from the tag and its diff.** This release was tagged, pushed
> and published with **no changelog entry in either SDK**. The `0.25.0` entry above named the hole
> and left it open; this fills it. The date is the date `v0.24.1` was tagged — a fact — and this
> note is here so the entry is not mistaken for one written at the time. Nothing below is inferred:
> the release is four files and they are quoted.

**SDK-pair release against spec `v0.24.1`.** `.spec-ref` moves **v0.23.0 → v0.24.1**, skipping
`v0.24.0`, which was never tagged in either SDK.

### Changed

- **Two configuration defaults moved, and they moved together.** The `0.25.0` note said one; it was
  two. `spec/08-configuration.md` raised `MaxOfflineTransactions` from `50` to the bottom of its new
  `1000--10000` range, and `OfflinePassMaxAge` from `3600` to `86400`. `CONFIG_KEY_REGISTRY`
  follows both:

  ```
  MaxOfflineTransactions   '50'   -> '1000'
  OfflinePassMaxAge        '3600' -> '86400'
  ```

  The first is what spec `0.24.1` exists for: `0.24.0` had raised the registry range past the
  values its own corpus carried, so three sites went on depicting `50` — a value a conformant
  station must now refuse with `5109 INVALID_CONFIGURATION_VALUE`.

- **One conformance vector moved with them.**
  `valid/core/boot-notification-response-full.json` carried `"MaxOfflineTransactions": "50"` in its
  `configuration` block — a server pushing a value below the new floor. It becomes `"1000"`.

  Nothing in this package enforced that pairing at the time. The vector was re-vendored by hand and
  it happened to be done correctly; the `vector-corpus` gate that makes it a checked property
  arrives in `0.26.0`.

- `package.json` bumped to `0.24.1`.

### Not changed

No payload type, no schema, no state machine. `check:config-registry` is what would have caught a
default left behind, and it was already wired — this release is what it asked for.

---

## 0.23.0 — 2026-08-18

**Three-repository release against spec `v0.23.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md)).
`.spec-ref` moves **v0.22.0 → v0.23.0**.

> ### ⚠ Two breaking changes: a removed `ConfigKey` case, and a schema tightening.

### The context, because this SDK's machine was the one that was right

`DiagnosticsStateMachine.ts` said so itself, in its own header: *"Source: implied from
DiagnosticsNotification status values"*. It was the only machine in `src/state-machines/` whose
source was not a canonical spec table, because until spec `0.23.0` there was no diagnostics section
in `05-state-machines.md` to cite. The `ospp-sdk-php` mirror read the same four status words as a
**server record** and got six edges starting at `pending`, with `uploaded` and `failed` terminal.
The two disagreed on three edges, each suite pinned its own answer — this one asserts
`['Idle','Failed']` is refused, the other asserted `PENDING -> FAILED` is permitted — and neither
could point at a source. Spec §8 now derives the machine from what the station does. **The seven
edges here survived that derivation unchanged.**

### Added — the wire ↔ machine bridge, which neither SDK had in either direction

The two unions were declared independently and nothing reconciled them: `DiagnosticsState` (5
values, with `Idle`) in the machine, `DiagnosticsNotificationStatus` (4 values) in the payload
module, no file referencing both. A consumer holding a status had no SDK-provided way to advance a
machine, so it wrote the mapping by hand — and the two edges it needed most, `Uploaded -> Idle` and
`Failed -> Idle`, **have no wire trigger at all** (§8.4). A consumer driving the machine from
arriving notifications therefore reached `Uploaded` and refused the `Collecting` that opens the next
upload. Single-use, by a different route than the PHP one.

New from `state-machines/DiagnosticsStateMachine.js`, all re-exported from the package root:

* `DIAGNOSTICS_NOTIFICATION_STATUSES` — the four values, declared **once**. The payload module now
  re-exports this type instead of re-declaring it, so the wire union and the FSM vocabulary can no
  longer drift into two hand-kept lists. The shape is the one `BayStatus`/`ReportableBayStatus`
  already uses — the single vocabulary in this SDK that was never split in two.
* `ReportableDiagnosticsState` — `Exclude<DiagnosticsState, 'Idle'>`, derived rather than re-listed.
* `diagnosticsStateFromNotificationStatus()` / `diagnosticsStateToNotificationStatus()` /
  `isReportableDiagnosticsState()` / `isDiagnosticsNotificationStatus()`. Nothing produces `Idle`
  from a wire value: §8.4 says those edges have no wire trigger, and a bridge that invented one
  would be inventing the only edge the protocol never announces.
* **`applyDiagnosticsNotification(current, status)`** — the function whose absence made the machine
  unusable as a notification consumer. A repeat of the current status is accepted and is **not** a
  transition, because `diagnostics-status.md` §5 rule 3 asks for a progress report at every 10% and
  all of them carry `status: "Uploading"`. §8.4: a server "MUST advance on a *change* of `status`
  and MUST NOT treat a second `Uploading` as an invalid transition." The table still has no
  `Uploading -> Uploading` edge and §8.3 says it MUST NOT gain one — the two are answers to
  different questions, and this function is where that distinction now lives.

### Added — `tests/state-machines/DiagnosticsCanonicalTable.test.ts`

The single home of the table, mirroring `FirmwareCanonicalTable.test.ts` and asserting the same
pair list as the `ospp-sdk-php` twin. It pins the seven `(from, to)` pairs as a named set, sweeps
all 25 ordered pairs, checks map-against-function, walks three consecutive uploads, and reads the
wire enum **out of the vendored schema** rather than a literal.

Verified non-vacuous before committing: making the outcomes terminal → **6 failures**; adding
`Idle -> Failed` → **1**; mis-mapping one arm of the bridge → **3**; treating the progress stream as
a transition → **1**; dropping a value from the wire enum → **4**.

### Removed — the tautological counter

`DiagnosticsStateMachine.test.ts` asserted `expect(valid).toHaveLength(7)` — the length of its own
literal array, which cannot fail on any change to `DIAGNOSTICS_TRANSITIONS`. The same file left two
of the 25 ordered pairs asserted **neither way**: `Uploaded -> Uploading` and `Failed -> Uploaded`.
Both are closed by the exhaustive sweep in the new file. This is the deletion
`FirmwareCanonicalTable.test.ts` argues for in its own header.

### Removed — breaking: `ConfigKey.DIAGNOSTICS_UPLOAD_URL`

Spec `0.23.0` withdrew the key. It had no reachable consumer: `uploadUrl` is REQUIRED on every
GetDiagnostics so nothing fell back to it, no processing rule read it, and no error code reported
the disabled state its documented `""` default claimed — measured across the reference server, this
SDK, the PHP SDK and the station simulator. `npm run check:config-registry` failed on the
re-vendor, which is the gate working: **29 keys → 28**, Device Management **4 → 3**.

**The cost is operational and lands on servers, not on this package.** An unknown key is answered
`NotSupported`, and `change-configuration.md` §6 rule 2 makes the batch atomic — one `NotSupported`
entry discards *every other key in the same ChangeConfiguration*. A server still carrying this key
in a push set finds the whole batch ineffective against a `0.23.0` station while the identical batch
still applies on `0.22.0`.

### Changed — vendored schema and corpus, in one commit

`src/schemas/mqtt/diagnostics-notification.schema.json` gains conditionals: `progress` only on
`Uploading`, `errorText` REQUIRED on `Failed` and forbidden elsewhere. The vector corpus moves with
it — **318 → 329** — because a tightening whose corpus lags turns this SDK's own conformance suite
red on payloads that are no longer valid. Three of the eight new negatives enter the `if`/`then`
branches of `get-diagnostics-response` and `set-maintenance-mode-response`, which **no vector had
ever entered**: both `allOf` blocks could have been deleted with the whole vendored corpus still
passing.

Suite: **1058 tests, 38 files**. `tsc --noEmit`, `npm run build`, and all four drift gates clean.

---

## 0.22.0 — 2026-08-18

**Three-repository release against spec `v0.22.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md)).
The spec's contract moved — a schema tightening and an error-registry change — so all three
repositories carry this number. `.spec-ref` moves **v0.20.2 → v0.22.0**, skipping `v0.21.0`,
which was a spec-only reversal neither SDK ever carried.

> ### ⚠ Two breaking changes, one of which reaches code that never mentions the error code.

### Changed — the pricing conditional is now enforced, and a price-less catalog item is refused

`schemas/common/service-item.schema.json` gained `if`/`then`: a `PerMinute` service requires
`priceCreditsPerMinute` and **MUST NOT** carry `priceCreditsFixed` or `priceLocalFixed`; `Fixed`
is the mirror. Before this, a service with a declared `pricingType` and **no price at all**
validated clean, and the spec's own "valid" conformance vector
`update-service-catalog-request-minimal.json` was exactly that payload.

Nothing in `src/` had to change for this: the rule arrives by vendoring. What *did* have to move
in the same commit is the vector — a schema tightening whose corpus is not updated with it turns
the SDK's own conformance suite red on a payload that is no longer valid. Measured here before
committing: schema without vector = **1 failed**, and the failure names that file.

`schemas/ble/available-services.schema.json` gained the same conditional.

### Changed — `5024 UNSUPPORTED_SERVICE` severity `Warning` → `Error`

The spec withdrew the partial application this code mandated: a station now refuses the **whole**
catalog rather than dropping the entry it cannot run. `OsppErrorCode` is updated to match.

**This is the change to look at if you branch on severity rather than on the code.** The code's
number, name and `recoverable` are all unchanged, so a consumer switching on `5024` sees nothing;
a consumer routing by `Severity` sees this move from an advisory to an error. Each SDK's
`check-error-registry` gate caught it against the spec — it was not found by reading.

### Unchanged, and verified so

The BLE change does not reach this SDK: `SchemaValidator` maps MQTT keys only, so the 61
`offline/` vectors are recorded as unmapped rather than validated — asserted by name in
`tests/validation/SchemaValidator.test.ts`. `ospp-sdk-php` **does** validate them, and its suite
went red on `offline/available-services-minimal.json` where this one did not. That asymmetry was
measured in both directions rather than assumed.

The corpus counts are unchanged: 318 vendored vectors, 61 unmapped, 47 schema keys. This release
edits four vectors and adds none.

---

## 0.20.0 — 2026-08-17

**SDK-pair release against spec `v0.20.2`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as `ospp/protocol`
**0.20.0**, from the same spec pin. `.spec-ref` moves **v0.19.0 → v0.20.2**.

> ### ⚠ This is a LOCKSTEP-ONLY release. It ships no code change.
>
> **Nothing in `src/` changed.** Not one line. `npm pack` produces the same 420-file list as
> 0.19.0, and the only differing byte inside it is `package.json`'s own `version` field. No
> schema changed; `src/test-vectors/` is not in `files` and is not published.
>
> **If you are reading this in six months to find out what 0.20.0 did to this package: it did
> nothing to this package.** It exists so the SDK pair carries one number, because
> `ospp/protocol` 0.20.0 *did* change — its firmware state machine was wrong — and because
> `.spec-ref` now claims v0.20.2. Upgrading 0.19.0 → 0.20.0 here cannot change your runtime
> behaviour. The work in this release is a **test** that had no way to exist before: see below.

Everything below is repository-internal — a new contract test, a pin move, and two re-vendored
(unpublished) conformance vectors.

### Added — `FirmwareCanonicalTable.test.ts`, mirrored in `ospp-sdk-php`

The firmware update state machine of `spec/05-state-machines.md` §6.3 had **no shared vector
list between the SDKs.** Each asserted its own transcription of the same table, so the two
could disagree indefinitely and both stay green.

They did disagree. **This SDK was correct** — all thirteen edges of §6.3 and neither of the
two it does not list. `ospp-sdk-php` carried `Downloaded -> Failed` and `Installed -> Failed`,
which §6.3 does not list, and lacked `Failed -> Idle`, which it does. That last omission made
the PHP machine single-use: §6.3 states *"a machine that treats [`Failed`] as terminal can run
one firmware update and never a second."*

Nothing compared the two, so nothing found it. `BayCanonicalTable.test.ts` already solved this
for the bay machine; this follows that pattern rather than inventing a second one. The pair
list is transcribed from §6.3 and is the same list
`ospp-sdk-php/tests/Contract/StateMachines/FirmwareCanonicalTableContractTest.php` asserts.

**It does not assert a cardinal, and that is deliberate.** §6.3 has fourteen **rows** and
thirteen **edges** — `Verifying -> Failed` is listed twice, for a checksum mismatch and for an
invalid signature. The PHP defect began as `transitionCount() === 14`, the row count, which
then needed two invented edges to reach. §6.3 now warns about exactly this. The test sweeps
the full 10×10 matrix against the named set, so it fails in **both** directions — verified by
injecting the PHP defect into this SDK's machine, which turned four of its cases red.

### Changed

- `.spec-ref`: **v0.19.0 → v0.20.2**. No schema changed between those tags. Two conformance
  vectors did, and both are re-vendored into `src/test-vectors/` (not published):
  `valid/device-management/firmware-status-notification-full.json` (`progress` 72 → 0) and the
  new `invalid/device-management/update-firmware-request-http-url.json` (a non-TLS
  `firmwareUrl`, rejected by the unchanged `^https://` pattern). The vendored corpus is now
  byte-identical to `v0.20.2`.
- `SchemaValidator.test.ts`: corpus count **317 → 318**, for the vector above.

### Why this releases anyway

[VERSIONING.md](https://github.com/ospp-org/spec/blob/main/VERSIONING.md): *"The two SDKs
release at the same version as each other. A consumer pairs them, so an identical number is
what tells them which pair is coherent."* `ospp/protocol` **must** release — its firmware FSM
was wrong. Holding this package at 0.19.0 would leave the two at different numbers, which is
the one thing the pairing rule exists to prevent, and would leave `.spec-ref` claiming v0.19.0
for a package whose vendored corpus is now v0.20.2.

`ts-station-simulator` pins `^0.19.0`, which npm resolves as `>=0.19.0 <0.20.0` — it will not
pick this up without an explicit constraint bump, and it uses no part of the firmware state
machine, so the bump is lockstep bookkeeping for it and nothing more.

## 0.19.0 — 2026-08-14

**SDK-pair release against spec `v0.19.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as `ospp/protocol`
**0.19.0**, from the same spec pin.

**This release changes code, and it is a breaking API change.** `.spec-ref` moves
**v0.17.0 → v0.19.0**, skipping `v0.18.0`, which changed nothing this package implements.

### BREAKING — `maySendUnsolicited` is removed; use `mayOriginate(state, action)`

Spec `v0.19.0` restated §1.4: *"A restricted station may originate exactly those messages that
repair its own standing with the server."* BootNotification restores the station's
registration; **SignCertificate** restores the credential without which it cannot connect at
all. Nothing else qualifies.

That makes the §1.4 rule **message-dependent**, and `maySendUnsolicited(state)` took no
message. It returned `state === Operational`, so it answered `false` for a `Pending` station
originating SignCertificate — which the specification now permits, and which is the whole
point of the change.

```diff
- import { maySendUnsolicited } from '@ospp/protocol';
- if (maySendUnsolicited(state)) { publish(msg); }
+ import { mayOriginate } from '@ospp/protocol';
+ if (mayOriginate(state, msg.action)) { publish(msg); }
```

**Why it was removed rather than kept beside the new one.** A second predicate answering the
real question would have left the first one answering the old one — still exported, still
returning `false` for a case that is now legal, still looking like the function to reach for.
The single boolean that can no longer answer *is* the defect; adding a second does not repair
it.

**The API cost, stated plainly.** `maySendUnsolicited` was a public export from the package
root. Removing it breaks a consumer **at compile time**, which is the loud failure and the
reason it was removed: had it been left in place returning the same values, a consumer using
it to gate *"may I send this message?"* would have gone on getting a wrong answer for
SignCertificate **silently** — no error, no type failure, just a station that never renews
while `Pending` and eventually needs a site visit. A compile error is the cheaper of the two.

Measured before removing: **no consumer in `csms-server`, `ts-station-simulator`,
`station-simulator`, `csms-mqtt-bridge` or `csms-sandbox` calls it.** The break is
theoretical for every repository in this project today.

### Added

- **`mayOriginate(state, action): boolean`** — the message-aware predicate. `Operational` may
  originate anything; `Pending` may originate `BootNotification` and `SignCertificate`;
  `Booting` and `Rejected` may originate `BootNotification` only, because they hold no session
  key and SignCertificate is one of the 44 signed message types (a sender with no key **MUST**
  refuse to send rather than send unsigned). `NotProvisioned` and `Disconnected` answer
  `false`, exactly as the removed function did — that is the §1.4 answer, not a transport
  claim.
- **`STANDING_REPAIR_ACTIONS`** — the two wire `action` values, frozen, and the same array
  `mayOriginate` tests against rather than a second copy that could drift from it. A test
  asserts that identity.

### Changed

- `StationState.PENDING`'s doc comment restated the old rule in prose (*"sends nothing
  unsolicited"*). It now names both permitted messages and says why the session key is what
  makes SignCertificate possible in `Pending` and impossible in `Rejected`. Same class as the
  fourteen restatement sites the spec release moved: a restatement left holding the old rule is
  how the contradiction was born.

### Not changed

- **No schema, vector, type or total moves.** The vendored `src/schemas/` tree is byte-identical
  to spec `v0.19.0` — verified by diff, not assumed — because `v0.18.0` and `v0.19.0` changed no
  JSON artefact. The change is in hand-written state-machine code, which is why "the spec diff is
  all Markdown" was necessary and not sufficient for judging SDK impact this time.

## 0.18.0 — 2026-08-13

**SDK-pair release against spec `v0.17.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as `ospp/protocol`
**0.18.0**, from the same spec pin.

**This release changes no code.** `.spec-ref` moves **v0.16.0 → v0.17.0** and nothing else
in this package moves with it. No schema is re-vendored, no vector, no enum, no type, no
total. If you are reading this to find out what to change on upgrade, the answer is nothing:
`0.17.0` and `0.18.0` build the same `dist/` from the same sources against a different pin.

### Why a release exists for this at all

`csms-server` could not move to spec `v0.17.0` while the PHP sibling pinned `v0.16.0`. Its
`VendoredSchemaSpecParityTest` reads the vendored package's `.spec-ref` and requires it to
equal the server's own **as a string** — it compares the marker, not the schemas. This
package is released in lockstep with that one, so it moves for the same reason at the same
version.

That gate is right to refuse, and the reason is worth stating precisely, because the
tempting objection is the one it exists to reject. *"The bytes are identical, so let the
server pin `v0.17.0` against a `v0.16.0` SDK"* is exactly the reasoning that produces
silent vendored-copy drift. A copy that happens to match today, compared against a spec
version nobody declared, is indistinguishable from a stale one — that is what a marker is
for. The marker is the claim; byte-identity is the proof of the claim. Weakening the claim
to preserve the proof gets the dependency backwards, and the fix is to move the marker.

### What was measured before the pin moved

`v0.16.0..v0.17.0` is **27 files, every one of them Markdown, zero JSON.** No schema and no
conformance vector changes. The only two files under a directory this package vendors are
`schemas/README.md` and `conformance/test-vectors/README.md`, each a single version-banner
line `0.16.0 → 0.17.0` — and neither is vendored here: `src/schemas/` carries no README, and
the byte-identity gate excludes `README.md` besides.

Two of the 27 are gate *sources*, which is why "all Markdown" is not on its own sufficient:

- `spec/07-errors.md` — version banner only. The 118-row error registry is untouched.
- `spec/08-configuration.md` — version banner, plus one Description cell on
  `OfflinePassPublicKey` narrowing the previous-key grace window to §6.7 step 4. Prose in a
  column no gate compares; the key's Type, Default, Access, Mutability and §1.5 Profile ID
  are unchanged. The config-registry gate's stated floor still holds — §1.5 keeps the
  normative Profile ID column at `v0.17.0`, so the gate parses 5 profiles rather than
  exiting 1 on zero rows.

The substantive change in `v0.17.0` is §6.7 gaining a second, compromise-driven rotation
posture. **Nothing follows from it here.** This package implements no previous-key retention
and no grace-period expiry — `OfflinePassPublicKey` appears only as a registry row — because
that requirement is station behaviour, and this is a protocol type, schema and
crypto-primitive library.

Every spec-facing gate was re-run against the `v0.17.0` tree **before** the pin moved, and
each reports what it compared rather than only that it passed:

- **vector types** — 12 spec vectors type-check against `src/types/`
- **error registry** — `118 codes` both sides, agreeing on errorText, severity, recoverable
- **config registry** — `29 keys, 5 profiles`, 29 profiles compared, agreeing on type,
  default, access, mutability and the §1.5 normative Profile ID
- **crypto corpus** — 4 named files byte-identical (`ble-handshake-keyschedule.json`,
  `rfc-primitive-anchors.json`, `canonical-form.json`, `server-test-pub.pem`)
- **schemas** — vendored `src/schemas/` byte-identical to the `v0.17.0` tree

`npm run build` and 1010 tests across 36 files are green, unchanged from `0.17.0` as they
must be, since no source file moved.

### Fixed

- **`package-lock.json` said `0.16.0` while `package.json` said `0.17.0`.** The lock was
  updated in the `0.16.0` release and then not in `0.17.0`, so the two disagreed for a full
  version. Nothing consumed the discrepancy — `npm publish` takes the version from
  `package.json` and the `0.17.0` tarball was correct — which is precisely why it survived:
  the field is load-bearing for no install, so no install failed. Both are `0.18.0` here.

### On this shape of release

A spec release that touches no schema and no vector will keep producing exactly this: a
version number whose entire content is a four-byte edit to `.spec-ref`. It is worth naming
as its own category rather than treating each occurrence as an oddity. **A release that
exists only to move a pin is not a release that ships code**, and reading it as one — asking
what to test, what broke, what to migrate — wastes the reader's attention on an empty set.
The MINOR bump is not a claim that something was delivered; under ADR-001 it is how the pair
stays at one version, and the pin is the deliverable.

The cost is real and falls on the consumer, not here: `csms-server` must land the composer
constraint and its own `.spec-ref` in **one commit**, because either alone is the drift the
parity gate fails on. `@ospp/station-simulator` has no pin of its own and owes only the
dependency bump.

## 0.17.0 — 2026-08-13

**SDK-pair release against spec `v0.16.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as
`ospp/protocol` **0.17.0**, from the same spec pin.

`.spec-ref` **v0.15.0 → v0.16.0**, and this is the cheap kind of bump: **nothing needs
re-vendoring.** `v0.16.0` changes no schema and no conformance vector — the only files that
moved under `schemas/` and `conformance/test-vectors/` are two README version banners, and
the byte-identity gate excludes `README.md` while the crypto gate names its four files
explicitly. Measured rather than assumed: every spec-facing gate was re-run against the
`v0.16.0` tree before the pin moved, and all are green. Worth saying out loud, because the
ordering a re-vendor *does* force — schemas, then vectors, then hardcoded totals, then the
pin — is expensive and is not needed here.

> **BREAKING — `CONFIG_KEY_REGISTRY[k].profile` answers `DeviceManagement` where it
> answered `DeviceMgmt`, and the `ConfigProfile` union changes with it.**
>
> The four Device Management keys: `FirmwareUpdateEnabled`, `DiagnosticsUploadUrl`,
> `LogLevel`, `AutoRebootEnabled`. The other four profiles are unchanged — `Core`,
> `Transaction`, `Security` and `OfflineBLE` were already spelled the way the spec now
> requires.
>
> `ConfigProfile` is a public export (`src/index.ts`, the browser-safe barrel), so this
> breaks in **two** ways depending on how it is consumed. A type-only consumer — anything
> annotating a variable `ConfigProfile` or narrowing on the union — breaks at **compile
> time**, loudly. A consumer comparing the emitted data at run time
> (`meta.profile === 'DeviceMgmt'`) breaks **silently**: the union erases, so nothing type-
> checks that string literal against the new vocabulary and the comparison simply stops
> matching. The second is the one to grep for.
>
> **This is an API break and NOT a protocol break, and the distinction is load-bearing.**
> The profile is metadata that never reaches the wire. No schema in `src/schemas/` declares
> a `profile` property; `get-configuration-response.schema.json` sets
> `additionalProperties: false` over exactly `key`, `value` and `readonly`, so the validator
> would *reject* a profile field. `CONFIG_KEY_REGISTRY` has three referencing sites in the
> package — its definition, the barrel re-export and its test — and no message builder,
> envelope or serializer is among them. **No byte on any MQTT or BLE payload changes, no
> canonical form changes, no MAC or signature input changes.** A station and a server on
> either side of this upgrade interoperate exactly as before.
>
> **`@ospp/station-simulator`, the only known consumer, does not read it.** No profile
> identifier appears anywhere in its source; it depends on this package at `^0.15.0`, which
> does not admit `0.17.0` at all.

### Changed

- **The registry carries the spec's normative Profile ID.** Spec `v0.16.0` §1.5 gains a
  **Profile ID** column — `Core`, `Transaction`, `Security`, `OfflineBLE`,
  `DeviceManagement` — and states that an implementation exposing a key's profile as a
  program value MUST use it exactly. Until that column existed there was only a display
  label to copy, and neither `Offline / BLE` nor `Device Management` survives being made an
  identifier: this package chose `OfflineBLE` and `DeviceMgmt`, `ospp/protocol` chose
  `Offline` and `DeviceManagement`. Four spellings of two profiles across two SDKs, none of
  them wrong against anything, because there was nothing to be wrong against. Each SDK
  changes exactly one value in this release.

- **`src/enums/ConfigKey.ts` cites §§2--6 rather than §9.** `v0.16.0` declares §§2--6
  normative and §9 derived from them, and the two do not carry the same columns. §9 is where
  `Device Mgmt` was spelled — the chapter's one profile label written two ways, and the
  reason this file had a third spelling to begin with.

- **docs:** `README.md` advertised *"41 configuration keys"*. There are 29, and have been
  since the enum was cut down.

### Added

- **`scripts/check-config-registry.ts` — the gate this package did not have.** The 0.15.0
  notes recorded that `ospp/protocol` had wired a Chapter 08 parity gate and that
  `CONFIG_KEY_REGISTRY` here was "still compared only against itself — the same position the
  PHP enum was in when it drifted". It was, and it had. `tests/enums/ConfigKey.test.ts`
  counts the keys in each profile, which stays green through any *renaming* of a profile.

  It compares `Type`, `Default`, `Access` and `Mutability` against §§2--6 and the **Profile
  ID** against §1.5, plus the key set in both directions. **On the first run it found no
  drift on the four §§2--6 properties** — this registry was correct on all 29 keys despite
  never having been checked against anything. Only the profile was wrong.

  It also checks one column the PHP sibling did not, for a structural reason: §§2--6 carry
  no profile column, so a gate built by parsing those rows is blind to the profile by
  construction. The PHP gate ran green against `v0.16.0` with its own drift live. Both gates
  now read §1.5.

  Three properties, the same as the sibling ratchets:

  - **Thresholds on each side before any comparison.** §1.5 is a *different table* from the
    §§2--6 rows, so a floor cleared by those says nothing about it: §1.5 could reformat,
    yield nothing, and leave the gate reporting a clean pass on four properties while
    checking zero keys for the fifth. It has its own floors — 5 profile rows, 25 keys named
    across them — plus one on the SDK side.
  - **Zero matched pairs is a failure, never a pass.** Every threshold above can be cleared
    by two tables that each parse fully and name *disjoint* key sets: both sides full, the
    intersection empty, nothing compared and nothing reported. The count of pairs actually
    compared is printed on success, so the number being asserted over is visible rather than
    inferred from silence.
  - **It refuses rather than reports success on too few rows**, and names the parser to fix.

  RED-tested four ways, each confirmed to exit 1: the real drift (reports exactly the four
  Device Management keys); spec `v0.15.0`, where the column does not exist yet (0 profile
  rows — **this gate cannot run against a spec older than v0.16.0, which is why the pin and
  the gate move in one commit**); two tables naming disjoint keys (0 pairs compared); and a
  misspelled Profile ID upstream (reported once as a vocabulary problem, not only as four
  per-key lines).

  Wired into CI as the `config-registry` job and as `npm run check:config-registry`. **The
  script is `100644` and does not need an exec bit** — CI invokes it through the npm script,
  which names `vite-node` as the interpreter, as every gate in this package does. That is
  deliberate: two gates in the sibling package shipped as `100644` while being invoked as
  bare `run: scripts/…` and died `Permission denied` on every run with the CI column green.
  If one is ever rewired as `./scripts/…`, the mode becomes load-bearing and must be
  `100755` in the git index, not merely on disk.

- **`tests/enums/ConfigKey.test.ts` pins the profile vocabulary.** The existing per-profile
  counts are a self-comparison and survive any rename; the new assertion requires every
  `profile` value to be one of the five §1.5 Profile IDs, so a rename has to be deliberate in
  two files. It is still in-repo — the gate above is what compares against something outside.

### Not in this release

- **No range validation.** `v0.16.0` declares the Chapter 08 Range column normative (§1.6)
  and widens `HeartbeatIntervalSeconds` from `30--3600` to `10--3600`. `ConfigKeyMeta` models
  no range, so there is nothing here to correct and nothing for the gate to compare.
- **Nothing for the Device Management profile becoming capability-conditional.** The registry
  records which profile a key belongs to, not whether that profile is required. The
  capability itself, `capabilities.deviceManagementSupported`, is already carried in
  `StationCapabilities` and is unchanged.

## 0.16.0 — 2026-08-13

**SDK-pair release against spec `v0.15.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as
`ospp/protocol` **0.16.0**, from the same spec pin.

`.spec-ref` **v0.13.0 → v0.15.0** — a **two-release** jump, and only the first of the two
carries anything. `v0.14.0` moved a schema and moved the corpus with it; `v0.15.0` touched
neither, so for a vendoring SDK it is the pin and nothing else. All the work below comes from
a range this SDK passes *through* rather than lands on — bumping to the newest tag is not the
same as skipping the middle one.

> **BREAKING — `SchemaValidator` now rejects MeterValues with an empty `values` object.**
>
> `src/schemas/common/meter-values.schema.json` gained `"minProperties": 1`. `{"values": {}}`
> validated for the whole life of this package and does not any more.
>
> **This is a behaviour change on a public export from the day it ships**, not a deferred one.
> `SchemaValidator` compiles Ajv over the vendored tree and is exported from
> `@ospp/protocol/server`; every file under `src/schemas/common/` is eagerly registered at
> construction, so the tightened schema is live on the first `validate()` call. It is reachable
> through **three** public schema keys — `meter-values-event`, `stop-service-response` and
> `transaction-event-request`, each `$ref`ing the common file — plus the BLE receipt and
> service-status schemas, which `SchemaPath` does not map and which therefore stay unreachable
> from the public validator.
>
> Any caller that validated a station's MeterValues and accepted `"values": {}` will now get
> `valid: false`. That is the intended outcome: `meter-values.md` §5 has always said *"The
> `values` object **MUST** contain at least one field"*, and for the whole of that time nothing
> enforced it. Such a payload was already non-conforming and was already being believed.
>
> `ospp/protocol` (PHP) 0.16.0 ships the identical schema, but `opis/json-schema` is
> `require-dev` there — that package validates nothing at run time — so the same tightening
> lands one layer out, in the server that compiles the vendored tree. Same schema, two blast
> radii, and this is the side where it is immediate.
>
> `MeterValues` in `src/types/common.ts` is **unchanged**: all three members stay optional. The
> type system cannot express `minProperties: 1` on an interface whose members are all optional,
> so `{ values: {} }` still type-checks and fails at validation. That asymmetry is deliberate —
> narrowing the type would break every legitimate single-reading construction — but it does mean
> **the compiler will not find your callers for you**. Grep for `values: {}`.

### Spec pin

`.spec-ref` **v0.13.0 → v0.15.0**, re-vendored and byte-identity verified through
`scripts/check-schemas.sh`'s own clone path. Schema changes across that range are two files,
both landing at `v0.14.0`:

- `common/meter-values.schema.json` — gained `"minProperties": 1`. The substantive change of
  this release and the only one with a caller consequence.
- `mqtt/session-ended-event.schema.json` — `seqNo.description` only. The old text said the
  counter *"matches the running seqNo of the last MeterValues"*; it now says the sequence
  **continues** — the next value after the last, not a repeat of it. Wire-inert, but it
  reversed which of two readings the schema endorsed, and under the minority one a conforming
  receiver sees a repeat where it MUST verify an increment.

### Vendored

- `src/schemas/` — byte-identical to spec `v0.15.0`, **86 files**, unchanged in count.
- `src/test-vectors/` — **160 valid + 157 invalid = 317** vectors, byte-identical to the tag's
  `conformance/test-vectors/`. Two moves, both consequences of `minProperties`:
  - `valid/transaction/meter-values-event-minimal.json` carried `"values": {}` — the shape the
    new schema forbids. **A valid vector encoding an invalid payload**, so re-vendoring the
    schema alone turns this suite red on it. It now carries one reading.
  - `invalid/transaction/meter-values-event-empty-values.json` — **new**, and it is the old
    content of the file above, moved across the boundary. The rule is now falsifiable rather
    than merely stated.
- **Nothing in this repository checks that second bullet.** `src/schemas/` has a byte-identity
  gate; the vendored corpus has none, in either SDK. See *The gap this release does not close*.
- The crypto corpus needed no work — `conformance/test-vectors/crypto/` is byte-identical
  between `v0.13.0` and `v0.15.0`, and all four gated files still match.

### Changed

- **`OsppErrorCode.COMMAND_PRE_EMPTED`'s docblock was narrower than the code it documents.**
  Written against spec `v0.11.1`, it said `details.wouldBe` **MUST** carry the code the station
  would have answered — unconditionally. `v0.15.0` widens `6008` to the two kinds of pre-empt
  it always had, and on the second `details.wouldBe` **MUST be absent**: a *server-protective*
  refusal (the open command circuit breaker is the defined case) is not a prediction about the
  station, and naming a code the station never gave is exactly the borrowing the entry exists
  to forbid. `details.reason` is promoted SHOULD → MUST, being the one member present on both.
  The docblock now carries both kinds and the fail-safe default — **absent `wouldBe` means the
  command did not run, and no outcome may be assumed.**

  No registry field changed, so nothing executable moved. Which is the uncomfortable part: a
  docblock asserting a MUST the specification has since relaxed is wrong in the one direction
  that matters, and no gate here can see it. `check:error-registry` parses columns 1–4 only —
  `code | errorText | Severity | Recoverable` — and stops before Description and Recommended
  Action. Correct by design; it also means the prose this SDK *does* carry is compared with
  nothing.

- **`SessionEndedPayload.seqNo`'s docblock echoed the superseded schema wording** — *"matches
  the running seqNo of the last MeterValues emitted for the session"*, the reading `v0.14.0`
  overturned in the schema description it was copied from. It now states the increment. Same
  class as the entry above: a restatement with no citation and no gate, drifting the moment its
  source moved.

### The gap this release does not close

Both SDKs vendor two artefacts from the spec — the schema tree **and** the conformance corpus —
and both CIs byte-diff only the first. So the schemas cannot drift and the vectors drift
freely, which is what happened, and the failure mode is inverted: a maintainer who does the
*right* thing (`cp -r spec/schemas`, bump `.spec-ref`) gets a red suite pointing at a hardcoded
number, with nothing saying the corpus was the other half of the job.

The literal is still a literal. It is updated here (`316` → `317`) and now carries a comment
saying what it is: a **second copy of a fact about the corpus, not a check on it**. Specified in
the spec's `KNOWN-ISSUES.md`, and scoped but deliberately **not built** here — a `diff -rq` of
the whole vendored tree against the spec clone, never a hand-maintained file list, plus a
parsed count asserted `> 0`, because a gate that reads zero vectors must not report a pass.

A third instance surfaced while scoping it, and it is already live: `scripts/check-crypto-vectors.sh`
gates its four files **from a hand-written list**, and the spec's crypto corpus has had a fifth,
`mqtt-mac.json`, vendored in **neither** SDK. Both gates report OK. Not fixed here — nothing
consumes that vector yet — but it is the defect the list form always produces, and it is why
the replacement must diff a tree.

### Verification

- `npm run build` — clean.
- `npm test` — **1009 tests across 36 files**, green (from 1008; the new invalid vector is the
  one added test, `SchemaValidator.test.ts` 262 → 263).
- `npm run typecheck` — clean.
- `npm run check:vector-types` — 12 spec vectors type-check against `src/types/` at `v0.15.0`.
- `npm run check:error-registry` — **118/118** agreeing against `v0.15.0`.
- `npm run check:crypto-vectors` — 4/4 byte-identical against `v0.15.0`.
- `bash scripts/check-schemas.sh` — `src/schemas/` byte-identical to `v0.15.0`.
- `diff -rq` of `src/test-vectors/{valid,invalid}` against the tag — clean, by hand, because no
  gate does it.

---

## 0.15.0 — 2026-08-12

**SDK-pair release against spec `v0.13.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as
`ospp/protocol` **0.15.0**, from the same spec pin.

`.spec-ref` **unchanged at v0.13.0** — no schema moves, no vector moves. The vendored
crypto corpus and the 118-code error registry are byte-identical to the same spec tag
they matched at 0.14.0.

> **Behaviour change, narrow: the default wire `protocolVersion` moves `0.2.1` → `0.3.0`.**
>
> Affects only a caller that takes the default — `createEnvelope()` without an explicit
> `protocolVersion`, or anything reading `OSPP_PROTOCOL_VERSION` directly. Such a caller
> previously announced `0.2.1`, which spec Chapter 08 stopped sanctioning at spec v0.10.0
> and which the production fleet does not speak. If you are pinned to a peer whose
> supported set is `{0.2.1}`, pass the version explicitly before upgrading.

### Fixed

- **`OSPP_PROTOCOL_VERSION` and `CONFIG_KEY_REGISTRY[ProtocolVersion].defaultValue` both
  answered `0.2.1`, where spec Chapter 08 says `0.3.0`.** Stale since spec v0.10.0 — four
  minor releases. `ospp/protocol` (PHP) carried the identical pair of stale defaults and
  is fixed in the same release pair; correcting either SDK alone would have converted a
  shared staleness into a **cross-SDK disagreement**, which is strictly worse. A station
  and a server that disagree on the version fail negotiation with `1007
  PROTOCOL_VERSION_MISMATCH`, and the error names the version, not the SDK that chose it —
  so the disagreement would have been paid for in debugging time at the far end of a wire.

  **Why four releases passed without a symptom.** Every consumer already overrode it, each
  having discovered the problem separately: `csms-server` sets `OSPP_PROTOCOL_VERSION` in
  its environment, and `ts-station-simulator` carried a local `WIRE_PROTOCOL_VERSION`
  constant added after a real UAT incident — a Last-Will envelope built without an explicit
  version inherited this constant, was refused `1007`, and dead-lettered, so the server
  never learned the station had vanished and orphaned-session recovery never ran. That
  constant is deleted in the simulator's matching bump; its docblock had named "when the
  SDK's own default is corrected" as its exit condition, and this is that release.

  The general shape is worth keeping: **a default that every caller overrides is a default
  that nothing exercises**, so no test and no wire capture can report it wrong. Silence
  around it measures how thoroughly it was routed around, not whether it is correct.

### Not in this release

- **No `check-config-registry` equivalent here yet.** `ospp/protocol` (PHP) wires a
  Chapter 08 parity gate into CI at 0.15.0, and it is what caught this. This SDK has
  `check:vector-types`, `check:error-registry` and `check:crypto-vectors`, but its
  `CONFIG_KEY_REGISTRY` is still compared only against itself — the same position the PHP
  enum was in when it drifted. Worth porting; recorded here rather than in a session that
  will be forgotten. (This SDK had `MessageSigningMode` right when the PHP one had it
  wrong, so the drift is not one-directional and neither registry is the trustworthy one.)

## 0.14.0 — 2026-08-12

**SDK-pair release against spec `v0.13.0`** ([ADR-001](https://github.com/ospp-org/spec/blob/main/adr/ADR-001-cross-repo-lockstep-versioning.md),
*SDK-pair releases against a spec tag*). Released at the same version as
`ospp/protocol` **0.14.0**, from the same spec pin.

`.spec-ref` **v0.11.1 → v0.13.0**.

> **BREAKING — this changes MAC bytes, and both ends of a link must move together.**
>
> This release corrects how a message is reduced to the bytes that get signed. A peer on
> 0.13.0 and a peer on 0.14.0 therefore compute **different MACs for the same message**, and
> the receiver rejects what it cannot verify. This is not an optional upgrade: it requires
> **both sides to move**, and — because a station and a server are different deployments on
> different schedules — it requires them to move in a **coordinated window**.
>
> **The dangerous part is how narrow the break is.** MACs are unchanged for any message whose
> strings are ASCII and whose object keys are ordinary identifiers — which is nearly every
> message on a real fleet. The golden HMAC vectors in this release carry the **same
> `expectedMac` values as 0.13.0**, unchanged. So a mixed fleet does not fail on upgrade. It
> works, for days, until one message of an affected shape crosses the wire:
>
> - any signed message carrying **U+2028 or U+2029** in any string — 33 free-string sites on
>   the signed path, including `messageId` and `action`, which are on *every* message;
> - any message whose open objects — `DataTransfer.data` (both directions),
>   `SecurityEvent.details`, `StartService.params` — carry keys that are **integer-like**
>   (`"2"`, `"10"`) or **non-BMP**.
>
> That one message fails verification and is rejected, nothing else is affected, and nothing
> in the failure points at a version skew. Plan the window; do not let the quiet period
> convince you the fleet is homogeneous.

### Fixed

- **Object keys were sorted in UTF-16 order, not UTF-8 byte order** (`06-security.md` §4.8.1
  step 1: "lexicographic byte ordering of the UTF-8 encoded key strings"). Two separate
  defects wore one description, and only the first is a sorting problem:

  1. `Array.prototype.sort()` compares UTF-16 code units. These disagree with UTF-8 bytes for
     every key pair straddling the BMP boundary, because a supplementary character is a
     surrogate pair starting `D800`–`DBFF` and therefore sorts *below* any key starting
     `E000`–`FFFF`, while its UTF-8 encoding starts `F0` and sorts *above*. `{U+FFFD,
     U+1D400}` is the minimal case, and this SDK emitted the two reversed.

  2. **The sort was then thrown away.** JavaScript objects hold integer-like keys in ascending
     *numeric* order ahead of every string key, whatever order they were inserted in, so
     rebuilding a sorted object loses the sort for exactly those keys. `.sort()` correctly
     produced `["1","10","2"]` and the rebuilt object emitted `1,2,10`. No comparator fixes
     this — the loss happens after the comparator has run. It needs `Map`, or building the
     string directly, and `canonicalize` now builds the string directly.

  The second needs no exotic character. It is ordinary JSON, reachable wherever the protocol
  does not constrain the keys, and it is the one likelier to have fired in production.

- **`5004 ELECTRICAL_SYSTEM` was `recoverable: true`; the spec has said `false` since
  v0.8.0** — eight spec releases. It is a §7.2 Level 3 (Faulted) entry trigger whose exit is
  physical intervention + operator verification + station reboot. A welded relay or a lost
  phase persists while the measured voltage reads nominal, so "power came back" does not mean
  the fault cleared, and a welded relay may leave the bay energised after the station believes
  it cut power. A consumer treating the fault as self-clearing could return that bay to
  service.

  It survived because the only thing checking the registry was the *other* SDK, which was
  wrong in exactly the same way. An audit recorded `recoverable` as "identical — 0 diffs" and
  that was true. Two implementations that agree are not evidence; they are one opinion held
  twice. See *Added* for the gate.

### Changed

- **BREAKING (API, not wire): `canonicalize()` no longer strips `mac`.** Removing `mac` is
  §5.3 step 1 — a pre-step belonging to the MAC computation — not §4.8. Canonical form is
  defined over *any* JSON value: receipt bodies (§6.2) and OfflinePass payloads are signed and
  have no `mac` field at all. A serializer that deletes a key named `mac` was quietly
  corrupting any value that legitimately carried one, and it made this SDK the only one of the
  three reference implementations to conflate the two sections — `ospp-sdk-php` keeps
  `CanonicalJsonSerializer::serialize()` pure and strips in `MacSigner`, and the spec's own
  `tools/canonical-form.mjs` does not mention `mac`.

  **`computeMac`, `verifyMac` and `signMessage` are unaffected** — they now call
  `canonicalizeForMac`, which strips exactly as before. MAC bytes do not change from this.
  Migration: if you called `canonicalize(message)` on an envelope and relied on the strip, call
  **`canonicalizeForMac(message)`**. `canonicalizeToBytes` is likewise pure now, restoring the
  identity `canonicalizeToBytes(v) === Buffer.from(canonicalize(v), 'utf-8')`.

- `canonicalize` rejects a `Map` or `Set` instead of silently canonicalizing it to `{}` — a
  signature over nothing that still verifies is the same failure class as the empty-object bug
  the vectors exist for.

### Added

- **`canonicalizeForMac(message)`** — §5.3 step 1 then §4.8. The twin of PHP's
  `MacSigner::canonicalize()`.

- **`npm run check:error-registry`** (CI job *Error registry vs spec registry*) — compares
  every code in `OSPP_ERROR_REGISTRY` against the registry table in the spec's
  `07-errors.md` at `.spec-ref`, on `errorText`, `severity`, `recoverable`, and the code set
  in both directions. This is the gate whose absence let 5004 drift for eight releases: the
  schema gate could not see the registry, because it is a Markdown table and not a schema, and
  the spec's own `verify-protocol.sh` scrapes that table with a regex that stops before the
  `Recoverable` column. `httpStatus` and `category` are deliberately not checked — the spec
  declines to give a code either one.

  It refuses to report a pass if it parses fewer than 100 rows, so a reformatted table fails
  loudly instead of vacuously.

- **`npm run check:crypto-vectors`** (CI job *Crypto corpus byte-identity gate*) — the script
  existed since v0.6.0 and **nothing ever ran it**. It is wired up now because
  `canonical-form.json` joined the corpus it guards.

- **Canonical-form vectors are now VENDORED FROM THE SPEC**, byte-identical, at
  `tests/crypto/fixtures/canonical-form.json` ←
  `conformance/test-vectors/crypto/canonical-form.json`. Previously the canonical-form vectors
  were two hand-maintained copies, one per SDK, whose agreement was asserted in a comment and
  by nothing else — so both could be edited into agreeing with each other and disagreeing with
  the spec, which is the shape of every defect in this release. The spec **recomputed** the
  oracle values from the §4.8.1 rule text in a third implementation rather than adopting either
  SDK's output; both SDKs reproduce all 17 byte for byte.

- **A falsifiability check** (the spec's Category 20, run on the vendored copy). A corpus that
  no longer separates right from wrong passes silently, so the suite runs the defect this SDK
  actually shipped — `Object.keys().sort()` plus a plain-object rebuild — over the same vectors
  and requires the corpus to **reject** it. Three vectors currently discriminate. If that count
  ever reaches zero the test says so instead of reporting green.

- **`canonical-mac-strip.json`** — the vector that would have caught the `canonicalize()`
  divergence, pinning both the pure §4.8 form and the §5.3 MAC input for the same message. It
  is deliberately *not* vendored: the spec's corpus carries no message with a `mac`, because
  §4.8 says nothing about the field, and that silence is exactly what hid the defect.

### Spec pin

`.spec-ref` **v0.11.1 → v0.13.0**, re-vendored and byte-identity verified. Schema changes
across that range are `description`-only, plus `trigger-message-request.bayId`, which was an
unconstrained string where every other `bayId` is a `$ref` to `bay-id.schema.json`.

---

## 0.13.0 — 2026-08-07

*Backfilled in 0.14.0.* This release shipped and was tagged, and the entry was never
written — `git show v0.13.0` carried the notes and `CHANGELOG.md` jumped from 0.12.0 to
0.14.0. The lockstep twin `ospp/protocol` **0.13.0** documented it at the time; this side
did not, which is its own small lockstep failure. Transcribed from the tag.

**SDK-pair release against spec `v0.11.1`.** Released at the same version as
`ospp/protocol` **0.13.0**, from the same spec pin.

### Added

- `SessionEndReason.OPERATOR_STOPPED` — an operator ended the session deliberately. The
  only member that bills a non-zero amount for a session the station did not run to
  completion.
- `OsppErrorCode.SERVICE_NOT_BOUND = 3019` — Error, recoverable, 409.
- `OsppErrorCode.COMMAND_PRE_EMPTED = 6008` — Warning, recoverable, 409.

This SDK carries no `recommendedAction` text, so the 4020 wording drift fixed in
`ospp/protocol` 0.13.0 has no counterpart here.

---

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
