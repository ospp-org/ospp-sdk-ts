/**
 * Gate: every number and version this package ASSERTS about itself, against the
 * thing it is an assertion about.
 *
 * Prose is not executable, so a sentence like *"27 MQTT actions"* or *"OSPP
 * protocol v0.2.5"* is a claim no test makes and no build breaks on. This script
 * is the one that reads them. Each entry in CLAIMS names a file, the exact
 * sentence, and where the true value is DERIVED from — the enum, the export
 * surface, the schema directory, `.spec-ref` — and the run fails if the two
 * disagree.
 *
 * ---
 *
 * **Why this gate exists.** `README.md` made six factual claims about this
 * package. Four were false:
 *
 * | claim | said | was |
 * |---|--:|--:|
 * | protocol version | `v0.5.0` | `v0.31.0` (`.spec-ref`) |
 * | error codes | 102 | 118 |
 * | bundled schemas | 64 | 86 |
 * | state machines | 5, named | 6 exported |
 * | MQTT actions | 27 | 27 |
 * | configuration keys | 29 | 29 |
 *
 * Every gate in this repository was green throughout, because not one of them
 * read `README.md` — the file an integrator installing `@ospp/protocol` sees
 * first, and the only description of this package that npm renders. Twelve
 * releases of vendored-corpus byte-identity said nothing about whether the front
 * page was true.
 *
 * **The reason it is a gate and not a correction.** Rewriting `102` to `118`
 * produces a file that is right today and rots on exactly the same schedule as
 * the one it replaced — the second number is no more compared than the first
 * was. The numbers stay in the prose, because a reader deserves them; what
 * changes is that they are now checked against a derivation on every run. That
 * is the only sense in which a number written in English can be said to be
 * derived.
 *
 * **The derivation chain, and why it is not circular.** README ← SDK ← spec.
 * The counts here are taken from the SDK's own enums and export surface, not
 * re-parsed from the spec, because each of those is ALREADY compared to the spec
 * upstream of this gate: `check-error-registry` for the 118 codes,
 * `check-config-registry` for the 29 keys, `check-action-registry` for the 27
 * actions, `check-schemas` for the 86 schema files. This gate closes the last
 * link — prose to code — and inherits the rest. Deriving these from the spec a
 * second time here would not add a check; it would add a second parser to keep
 * in step.
 *
 * **A claim that matches zero times is a FAILURE, not a pass.** A pattern that
 * stops matching means the sentence was reworded or deleted, and a gate that
 * silently checks nothing is the failure mode this package has already shipped
 * twice — `check-crypto-vectors.sh` existed for eight releases and ran in no
 * job, and the pre-`v0.27.0` corpus gate printed `OK` through twelve minors of
 * README drift. Exactly-once is the assertion.
 *
 * Usage:
 *   npm run check:doc-claims       # no network, no spec clone — everything is local
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OsppAction } from '../src/actions/OsppAction.js';
import { OSPP_ERROR_REGISTRY } from '../src/enums/OsppErrorCode.js';
import { ConfigKey } from '../src/enums/ConfigKey.js';
import { RECOMMENDED_ACTION } from '../src/enums/RecommendedAction.js';
import { SessionEndReason } from '../src/enums/SessionEndReason.js';
import * as sdk from '../src/index.js';
import * as sdkServer from '../src/server.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── derivations ────────────────────────────────────────────────────────────

/** The pinned spec tag. The single source of truth for "which spec is this?". */
const specRef = (): string => readFileSync(join(ROOT, '.spec-ref'), 'utf8').trim();

/** Every `*.schema.json` bundled under src/schemas/, recursively. */
function countSchemas(dir: string): number {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countSchemas(join(dir, e.name));
    else if (e.name.endsWith('.schema.json')) n += 1;
  }
  return n;
}

/**
 * The state machines this package EXPORTS, by their short name.
 *
 * Read off the public surface rather than by listing `src/state-machines/`,
 * because the README's claim is about what a consumer gets, and a file that is
 * not exported is not that. The two happen to agree today; the README's own
 * error was the other direction — `StationStateMachine` had been exported for
 * some time and the sentence still named five.
 */
const stateMachines = (): string[] =>
  Object.keys(sdk)
    .map((k) => /^(.+)StateMachine$/.exec(k)?.[1])
    .filter((k): k is string => k !== undefined)
    .sort();

/** The longest corrective-action cell, in code points — the bound in Appendix C is 500. */
const longestAction = (): number =>
  Math.max(...Object.values(RECOMMENDED_ACTION).map((v) => [...v].length));

/**
 * A `minItems..maxItems` bound, read off the vendored schema that enforces it.
 *
 * The schema is byte-identical to the spec's (`check-schemas`), so a prose bound
 * checked against it is checked against the spec — one link further along the
 * same chain the counts use.
 */
function schemaBound(rel: string, property: string): string {
  const s = JSON.parse(readFileSync(join(ROOT, 'src', 'schemas', rel), 'utf8')) as {
    properties?: Record<string, { minItems?: number; maxItems?: number }>;
  };
  const p = s.properties?.[property];
  if (p?.minItems === undefined || p.maxItems === undefined) {
    throw new Error(`${rel}: property '${property}' has no minItems/maxItems — the schema shape changed`);
  }
  return `${p.minItems}..${p.maxItems}`;
}

/** Normalise a comma-separated prose list to a comparable, order-free form. */
const asSet = (s: string): string =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .sort()
    .join(', ');

// ── the claims ─────────────────────────────────────────────────────────────

interface Claim {
  /** Repo-relative file the sentence lives in. */
  file: string;
  /** Short name, printed in the report. */
  label: string;
  /** Must contain exactly one capture group, and must match exactly once in the file. */
  pattern: RegExp;
  /** The derived truth, as it should appear in the prose. */
  expected: () => string;
  /** Where the derived value comes from — printed on failure so the reader can check the checker. */
  from: string;
}

const CLAIMS: Claim[] = [
  {
    file: 'README.md',
    label: 'spec version',
    pattern: /pinned to spec `(v[0-9]+\.[0-9]+\.[0-9]+[^`]*)`/,
    expected: specRef,
    from: '.spec-ref',
  },
  {
    file: 'README.md',
    label: 'MQTT actions',
    pattern: /\*\*([0-9]+) MQTT actions\*\*/,
    expected: () => String(Object.values(OsppAction).length),
    from: 'Object.values(OsppAction).length',
  },
  {
    file: 'README.md',
    label: 'error codes',
    pattern: /\*\*([0-9]+) error codes\*\*/,
    expected: () => String(Object.keys(OSPP_ERROR_REGISTRY).length),
    from: 'Object.keys(OSPP_ERROR_REGISTRY).length',
  },
  {
    file: 'README.md',
    label: 'configuration keys',
    pattern: /\*\*([0-9]+) configuration keys\*\*/,
    expected: () => String(Object.keys(ConfigKey).length),
    from: 'Object.keys(ConfigKey).length',
  },
  {
    file: 'README.md',
    label: 'state machines (count)',
    pattern: /\*\*([0-9]+) state machines\*\*/,
    expected: () => String(stateMachines().length),
    from: 'exports of src/index.ts matching /^(.+)StateMachine$/',
  },
  {
    // The count alone would have passed a README that said "6" and still named
    // five — the list is a claim about a SET, and is compared as one.
    file: 'README.md',
    label: 'state machines (names)',
    pattern: /\*\*[0-9]+ state machines\*\* \(([^)]*)\)/,
    expected: () => stateMachines().join(', '),
    from: 'exports of src/index.ts matching /^(.+)StateMachine$/',
  },
  {
    file: 'README.md',
    label: 'bundled schemas',
    pattern: /with ([0-9]+) bundled schemas/,
    expected: () => String(countSchemas(join(ROOT, 'src', 'schemas'))),
    from: 'src/schemas/**/*.schema.json',
  },
  {
    // `check-recommended-action` enforces the 1..500 bound but never states the
    // margin; this sentence does, and until now nothing compared it. A cell
    // re-transcribed past 500 fails there — one re-transcribed to 499 fails only
    // here, and the sentence claiming no shortening is needed is the thing that
    // would have gone quietly false.
    file: 'src/enums/RecommendedAction.ts',
    label: 'longest action cell',
    pattern: /longest ([0-9]+) of 500/,
    expected: () => String(longestAction()),
    from: 'max code-point length over RECOMMENDED_ACTION',
  },

  // ── the same sentence, one file down: every enum in src/enums/ opens by
  // stating its own size, and not one of those numbers was compared to the enum
  // underneath it. All four were right when this gate was written. So was the 27
  // in OsppAction.ts, on the line whose protocol version had been false for
  // twenty-nine minors — being right is not the property that matters, being
  // checked is.
  {
    file: 'src/enums/ConfigKey.ts',
    label: 'ConfigKey size',
    pattern: /All ([0-9]+) standard OSPP configuration keys/,
    expected: () => String(Object.keys(ConfigKey).length),
    from: 'Object.keys(ConfigKey).length',
  },
  {
    file: 'src/enums/OsppErrorCode.ts',
    label: 'OsppErrorCode size',
    pattern: /All ([0-9]+) standard OSPP error codes/,
    expected: () => String(Object.keys(OSPP_ERROR_REGISTRY).length),
    from: 'Object.keys(OSPP_ERROR_REGISTRY).length',
  },
  {
    // Distinct from the claim above despite the equal number: this one asserts
    // the TRANSCRIPTION is complete, and 118 codes with 107 actions is exactly
    // the state this file was written to end.
    file: 'src/enums/RecommendedAction.ts',
    label: 'actions transcribed',
    pattern: /All ([0-9]+) registry codes are transcribed/,
    expected: () => String(Object.keys(RECOMMENDED_ACTION).length),
    from: 'Object.keys(RECOMMENDED_ACTION).length',
  },
  {
    file: 'src/enums/SessionEndReason.ts',
    label: 'SessionEndReason size',
    pattern: /\(([0-9]+) values as of spec/,
    expected: () => String(Object.keys(SessionEndReason).length),
    from: 'Object.keys(SessionEndReason).length',
  },
  {
    // The one place a bare spec version legitimately remains in `src/`: the
    // sentence dates the widening from six values to seven, so the number is
    // load-bearing prose rather than a restatement of the pin. It is pinned to
    // `.spec-ref` anyway — when the pin moves, the count above it is exactly
    // what needs re-checking, and this is the line that says so.
    file: 'src/enums/SessionEndReason.ts',
    label: 'SessionEndReason as-of',
    pattern: /values as of spec ([0-9]+\.[0-9]+\.[0-9]+)\)/,
    expected: () => specRef().replace(/^v/, ''),
    from: '.spec-ref (leading `v` stripped, to match the prose)',
  },
  {
    file: 'src/types/payloads/boot-notification.ts',
    label: 'bays bound',
    pattern: /^\s*\* ([0-9]+\.\.[0-9]+) entries\.$/m,
    expected: () => schemaBound(join('mqtt', 'boot-notification-request.schema.json'), 'bays'),
    from: 'minItems..maxItems of `bays` in the vendored boot-notification-request schema',
  },
];

// ── the comparator ─────────────────────────────────────────────────────────

interface Problem {
  label: string;
  file: string;
  detail: string;
}

/**
 * Check one claim against one file's text. Returns null when the claim holds.
 *
 * `set` compares order-free, for claims whose prose is a list.
 */
function check(claim: Claim, text: string, expected: string, set = false): Problem | null {
  // Carry the pattern's OWN flags across, not just `g`. Rebuilding with `g`
  // alone silently drops `m`, and a multi-line-anchored pattern then matches
  // zero times — which this function reports as a missing claim rather than a
  // pass, which is how the omission surfaced instead of hiding.
  const flags = claim.pattern.flags.includes('g') ? claim.pattern.flags : claim.pattern.flags + 'g';
  const hits = text.match(new RegExp(claim.pattern.source, flags)) ?? [];

  if (hits.length !== 1) {
    return {
      label: claim.label,
      file: claim.file,
      detail:
        `expected exactly one match for ${claim.pattern} — found ${hits.length}. ` +
        (hits.length === 0
          ? 'The sentence was reworded or removed; this gate can no longer see it. ' +
            'Restore the wording or update the pattern in scripts/check-doc-claims.ts — ' +
            'do not leave the claim unchecked.'
          : 'Ambiguous: the same claim is made in more than one place, and this gate cannot ' +
            'tell which is authoritative.'),
    };
  }

  const found = claim.pattern.exec(text)![1];
  const [a, b] = set ? [asSet(found), asSet(expected)] : [found, expected];
  if (a !== b) {
    return {
      label: claim.label,
      file: claim.file,
      detail: `says "${found}", derived value is "${expected}"  (from ${claim.from})`,
    };
  }
  return null;
}

// ── positive control ───────────────────────────────────────────────────────
//
// Every result below is a report of ABSENCE — "nothing disagrees" — and a
// comparator that has stopped comparing produces that report, in the same
// words, with rc=0. So the comparator is first run over synthetic text with the
// answer known: one claim that must pass, one that must fail, and one whose
// sentence is missing entirely. If the instrument cannot fail on demand, its
// silence about the real files means nothing and this exits without looking.

const CONTROL_CLAIM: Claim = {
  file: '(control)',
  label: 'control',
  pattern: /\*\*([0-9]+) widgets\*\*/,
  expected: () => '7',
  from: '(synthetic)',
};

const controlFailures: string[] = [];
if (check(CONTROL_CLAIM, 'it has **7 widgets** in total', '7') !== null) {
  controlFailures.push('a claim that AGREES was reported as a problem');
}
if (check(CONTROL_CLAIM, 'it has **6 widgets** in total', '7') === null) {
  controlFailures.push('a planted wrong number was NOT caught');
}
if (check(CONTROL_CLAIM, 'the sentence is gone', '7') === null) {
  controlFailures.push('a MISSING claim was treated as passing');
}
if (check(CONTROL_CLAIM, '**7 widgets** and again **7 widgets**', '7') === null) {
  controlFailures.push('a DUPLICATED claim was treated as passing');
}
if (check({ ...CONTROL_CLAIM, pattern: /\(([^)]*)\)/ }, '(b, a)', 'a, b', true) !== null) {
  controlFailures.push('an order-free list comparison rejected a matching set');
}
if (check({ ...CONTROL_CLAIM, pattern: /\(([^)]*)\)/ }, '(a, c)', 'a, b', true) === null) {
  controlFailures.push('an order-free list comparison accepted a differing set');
}

if (controlFailures.length > 0) {
  console.error('ERROR: positive control FAILED — the comparator does not work:');
  for (const f of controlFailures) console.error(`  - ${f}`);
  console.error(
    '\nRefusing to report anything about the real files. A gate that cannot fail on a planted\n' +
      'defect proves nothing when it passes.',
  );
  process.exit(1);
}
console.log('positive control: comparator caught a wrong value, a missing claim, a duplicated');
console.log('                  claim and a differing set, and passed a correct one — OK');

// ── run ────────────────────────────────────────────────────────────────────

const cache = new Map<string, string>();
const read = (f: string): string => {
  let t = cache.get(f);
  if (t === undefined) {
    t = readFileSync(join(ROOT, f), 'utf8');
    cache.set(f, t);
  }
  return t;
};

const problems: Problem[] = [];
for (const claim of CLAIMS) {
  const isSet = claim.label.endsWith('(names)');
  const p = check(claim, read(claim.file), claim.expected(), isSet);
  if (p) problems.push(p);
}

const files = [...new Set(CLAIMS.map((c) => c.file))];
console.log(`checked ${CLAIMS.length} claims across ${files.length} files: ${files.join(', ')}`);
for (const c of CLAIMS) console.log(`  ${c.label.padEnd(24)} derived = ${c.expected()}`);

if (problems.length > 0) {
  console.error(`\nFALSE CLAIMS — ${problems.length} of ${CLAIMS.length}:\n`);
  for (const p of problems) console.error(`  ${p.file} — ${p.label}: ${p.detail}`);
  console.error(
    '\nFix: change the prose to the derived value. If the DERIVED value is what is wrong,\n' +
      'the defect is in the code or in .spec-ref, not in the sentence — fix it there.',
  );
  process.exit(1);
}

// ── the one part of the prose that IS executable ───────────────────────────
//
// Every claim above is a NUMBER. The README's other assertion is a code block, and
// nothing read it. Measured on 2026-09-06, the only usage example was wrong TWICE:
// it imported `requiresHmac`, which occurs zero times in `src/` and zero times in
// `tests/` — the real export is `requiresMac` — and it imported `SchemaValidator`
// from the root, which `src/index.ts:6` says in its own header lives behind the
// `./server` subpath because it is Node-only. The first thing an integrator pastes
// did not compile, and this gate was green throughout, because deriving a number
// says nothing about whether the example beside it names things that exist.
//
// Derived, not listed, and per ENTRY POINT. The subpaths come from `package.json`'s
// `exports` map, so a new one that nothing here can resolve is instrument-broken
// rather than silently unchecked; each surface is the runtime namespace of its
// module unioned with the identifiers of its `export type { … }` blocks. `A as B`
// exports B. Nothing is maintained by hand.
//
// CHANGELOG.md is excluded by ROLE, as the record documents are in the spec's gate:
// its examples describe the API of the release they head, and `SchemaPath` is
// correct there and withdrawn here. A gate that forbade that would forbid the record.

const EXPORT_BLOCK = /export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g;

function surfaceOf(runtime: object, sourceRel: string): Set<string> {
  const names = new Set<string>(Object.keys(runtime));
  const text = readFileSync(join(ROOT, sourceRel), 'utf8');
  for (const m of text.matchAll(EXPORT_BLOCK)) {
    for (const raw of m[1].split(',')) {
      const name = raw.replace(/\/\/.*$/gm, '').trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  return names;
}

const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  name: string;
  exports: Record<string, unknown>;
};
const SOURCE_OF_SUBPATH: Record<string, [object, string]> = {
  '.': [sdk, 'src/index.ts'],
  './server': [sdkServer, 'src/server.ts'],
};
const surfaces = new Map<string, Set<string>>();
for (const subpath of Object.keys(PKG.exports)) {
  const entry = SOURCE_OF_SUBPATH[subpath];
  if (!entry) {
    console.error(
      `ERROR: package.json exports "${subpath}" and this gate cannot resolve it, so any example\n` +
        'importing from it would be checked against nothing. Add it to SOURCE_OF_SUBPATH.',
    );
    process.exit(1);
  }
  const specifier = subpath === '.' ? PKG.name : PKG.name + subpath.slice(1);
  surfaces.set(specifier, surfaceOf(entry[0], entry[1]));
}

const TS_FENCE = /```(?:typescript|ts|tsx)\r?\n([\s\S]*?)```/g;
const NAMED_IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"](@[^'"]+)['"]/g;

interface ExampleImport {
  name: string;
  from: string;
  line: number;
}

/** Identifiers a markdown text imports from this package, with the line each sits on. */
function importedIdentifiers(text: string): ExampleImport[] {
  const out: ExampleImport[] = [];
  for (const fence of text.matchAll(TS_FENCE)) {
    const body = fence[1];
    const fenceStart = (fence.index ?? 0) + fence[0].indexOf(body);
    for (const imp of body.matchAll(NAMED_IMPORT)) {
      const from = imp[2];
      if (from !== PKG.name && !from.startsWith(PKG.name + '/')) continue;
      const listStart = fenceStart + (imp.index ?? 0) + imp[0].indexOf(imp[1]);
      let cursor = 0;
      for (const raw of imp[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/)[0]?.trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) {
          const at = listStart + cursor + raw.indexOf(name);
          out.push({ name, from, line: text.slice(0, at).split('\n').length });
        }
        cursor += raw.length + 1;
      }
    }
  }
  return out;
}

// Control before belief: a planted identifier must be caught, a real one must not,
// and an identifier that is real only on ANOTHER subpath must be caught on this one.
{
  const probe =
    '```typescript\n' +
    "import { OsppAction, notAnExportAtAll, SchemaValidator } from '@ospp/protocol';\n" +
    '```';
  const parsed = importedIdentifiers(probe);
  const root = surfaces.get(PKG.name)!;
  const unknown = parsed.filter((i) => !root.has(i.name)).map((i) => i.name);
  const ok =
    parsed.length === 3 &&
    unknown.length === 2 &&
    unknown.includes('notAnExportAtAll') &&
    unknown.includes('SchemaValidator') &&
    surfaces.get(PKG.name + '/server')!.has('SchemaValidator');
  if (!ok) {
    console.error(
      'ERROR: positive control FAILED — the example reader does not discriminate.\n' +
        `  parsed ${parsed.length}, unknown [${unknown.join(', ')}]`,
    );
    process.exit(1);
  }
}

const docFiles = readdirSync(ROOT).filter((f) => f.endsWith('.md') && f !== 'CHANGELOG.md');
const exampleProblems: string[] = [];
let exampleIdentifiers = 0;
for (const f of docFiles) {
  for (const { name, from, line } of importedIdentifiers(readFileSync(join(ROOT, f), 'utf8'))) {
    exampleIdentifiers++;
    if (surfaces.get(from)?.has(name)) continue;
    const elsewhere = [...surfaces].find(([spec, set]) => spec !== from && set.has(name))?.[0];
    const near = [...(surfaces.get(from) ?? [])].find(
      (e) => e.toLowerCase().replace(/[^a-z]/g, '') === name.toLowerCase().replace(/[^a-z]/g, ''),
    );
    exampleProblems.push(
      `${f}:${line} — imports \`${name}\` from '${from}', which does not export it` +
        (elsewhere ? ` (it is exported by '${elsewhere}')` : near ? ` (did you mean \`${near}\`?)` : ''),
    );
  }
}

if (exampleIdentifiers === 0) {
  console.error(
    'ERROR: no example imported anything from this package — the fence or import pattern\n' +
      'matches nothing, so this check would pass vacuously. Refusing to report a pass.',
  );
  process.exit(1);
}
console.log(
  `example imports: ${exampleIdentifiers} identifier(s) across ${docFiles.length} markdown file(s), ` +
    `against ${[...surfaces].map(([s, v]) => `${s}=${v.size}`).join(' · ')}`,
);

if (exampleProblems.length > 0) {
  console.error(`\nEXAMPLES THAT DO NOT COMPILE — ${exampleProblems.length}:\n`);
  for (const e of exampleProblems) console.error(`  ${e}`);
}
if (exampleProblems.length > 0 || problems.length > 0) process.exit(1);

console.log(`OK — all ${CLAIMS.length} documented claims agree with what this package actually contains`);
