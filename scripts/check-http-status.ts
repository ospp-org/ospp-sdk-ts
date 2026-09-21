/**
 * Gate: where the spec names an HTTP status for a code, this SDK MUST use it.
 *
 * WHY THIS EXISTS, MEASURED RATHER THAN ARGUED
 * --------------------------------------------
 * `httpStatus` is an SDK extension. The spec's Error Object (§1.3) has no status
 * member and §3's registry table has no status column — `07-errors.md` says in
 * as many words that a code and a status "answer different questions". So the
 * two SDKs were free to answer independently, and they did.
 *
 * Dumped from both at spec v0.42.0, 2026-09-21:
 *
 *   codes in both SDKs                  120
 *   named by the §2.4 status table       31
 *   not named                            89
 *   the two SDKs AGREE on                79
 *   the two SDKs DIVERGE on              41
 *
 *   divergence among the 31 NAMED         0
 *   divergence among the 89 UNNAMED      41
 *
 * The divergence is perfectly correlated with the spec's silence. Not one of the
 * 41 disagreements is a code the spec has spoken about; every code it HAS spoken
 * about, both SDKs already answer the same way, and both already answer it the
 * way §2.4 does — 0 of 31 disagree on each side.
 *
 * That is the shape of a gap, not of a bug, and it decides what this gate is.
 * There is nothing here to repair: what was missing is anything that would
 * NOTICE if the agreement broke. `check-error-registry` compares `errorText`,
 * `severity` and `recoverable` and stops — deliberately, because those are the
 * columns §3 carries — so a status could be edited to anything at all and every
 * gate in this repository would stay green.
 *
 * WHAT THIS CHECKS, AND WHAT IT DELIBERATELY DOES NOT
 * ---------------------------------------------------
 * Only the 31 codes §2.4's table names. Where the spec is silent the SDK is
 * free, and this gate says nothing about those 89 — pinning them here would
 * invent a normative rule the specification declines to state, and would freeze
 * a choice whose only current justification is that someone made it. The 41
 * divergences are therefore NOT findings and are not reported as such.
 *
 * It does NOT propose widening §2.4. Adding codes to that table is a normative
 * change to the specification and belongs in a spec PR, not in an SDK gate.
 *
 * Usage:
 *   npm run check:http-status                        # clones the pinned ref
 *   SPEC_REPO=/local/path npm run check:http-status  # uses a local checkout
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OSPP_ERROR_REGISTRY } from '../src/enums/OsppErrorCode.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_REF = readFileSync(join(ROOT, '.spec-ref'), 'utf8').trim();

// .spec-ref is PR-mutable and is passed to `git clone --branch`. execFileSync
// takes an argv array, so there is no shell to inject into — but a value
// beginning with `-` would still be read by git as an OPTION. Validate against
// the same SemVer-tag allowlist the other gates use, before it reaches argv.
if (!/^v\d+\.\d+\.\d+(-[a-zA-Z0-9._-]+)?$/.test(SPEC_REF)) {
  console.error(
    `ERROR: .spec-ref value '${SPEC_REF}' does not match SemVer tag pattern (v<MAJOR>.<MINOR>.<PATCH>[-prerelease])`,
  );
  process.exit(1);
}

let specRoot = process.env.SPEC_REPO;
let tmp: string | undefined;
if (specRoot) {
  console.log(
    `Comparing against local spec checkout at ${specRoot} (.spec-ref=${SPEC_REF} — not enforced for local mode)`,
  );
} else {
  tmp = mkdtempSync(join(tmpdir(), 'ospp-spec-'));
  specRoot = join(tmp, 'spec');
  console.log(`Cloning ospp-org/spec at ${SPEC_REF}...`);
  execFileSync(
    'git',
    ['clone', '--quiet', '--depth', '1', '--branch', SPEC_REF, 'https://github.com/ospp-org/spec.git', specRoot],
    { stdio: 'inherit' },
  );
}

/**
 * Parse §2.4's "HTTP status code mapping" table.
 *
 * The table is keyed the other way round from the SDK: one row per STATUS, whose
 * second cell lists the codes typically answered with it. So a row is exploded
 * into one entry per code rather than read as a pair.
 */
function statusTable(md: string): Map<number, number> {
  const block = /\*\*HTTP status code mapping:\*\*\s*\n([\s\S]*?)(?=\n\n)/.exec(md);
  if (!block) {
    console.error(
      "ERROR: the '**HTTP status code mapping:**' table is not in spec/07-errors.md —\n" +
        'the section has been renamed or restructured; fix this parser rather than the spec.',
    );
    process.exit(2);
  }
  const out = new Map<number, number>();
  for (const row of block[1].split('\n')) {
    if (!row.startsWith('|')) continue;
    const cells = row.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 2 || !/^\d{3}$/.test(cells[0])) continue;
    for (const code of cells[1].match(/\b\d{4}\b/g) ?? []) {
      out.set(Number(code), Number(cells[0]));
    }
  }
  return out;
}

try {
  const md = readFileSync(join(specRoot, 'spec', '07-errors.md'), 'utf8');
  const table = statusTable(md);

  const sdk = new Map<number, number>();
  for (const [code, meta] of Object.entries(OSPP_ERROR_REGISTRY)) {
    sdk.set(Number(code), meta.httpStatus);
  }

  // ── positive control ─────────────────────────────────────────────────────
  //
  // A comparator that finds nothing proves nothing. Before the real comparison
  // runs, the same comparison runs over a table with one status deliberately
  // wrong, and this gate refuses a verdict unless that is caught.
  const first = table.keys().next();
  if (first.done) {
    console.error('ERROR: the §2.4 table parsed to ZERO codes — nothing could be compared.');
    process.exit(2);
  }
  const control = new Map(table);
  control.set(first.value, control.get(first.value) === 599 ? 598 : 599);
  let controlCaught = false;
  for (const [code, status] of control) {
    if (sdk.has(code) && sdk.get(code) !== status) controlCaught = true;
  }
  if (!controlCaught) {
    console.error('ERROR: positive control FAILED — a deliberately wrong status was not caught.');
    process.exit(2);
  }
  console.log('positive control: a deliberately wrong status in the §2.4 table was caught — OK');

  // ── non-vacuity ──────────────────────────────────────────────────────────
  //
  // The table named 31 codes at v0.42.0. A parse that suddenly yields a handful
  // means the markup moved, and a gate comparing three codes while reporting
  // success is the failure this family of repositories has shipped before.
  if (table.size < 20) {
    console.error(
      `ERROR: parsed only ${table.size} code(s) from the §2.4 status table —\n` +
        'the table markup has changed. Refusing a verdict rather than checking almost nothing.',
    );
    process.exit(2);
  }

  const problems: string[] = [];
  for (const [code, status] of table) {
    if (!sdk.has(code)) {
      problems.push(`${code}: named by the §2.4 status table, MISSING from OSPP_ERROR_REGISTRY`);
      continue;
    }
    if (sdk.get(code) !== status) {
      problems.push(`${code}: §2.4 says HTTP ${status}, this SDK answers ${sdk.get(code)}`);
    }
  }

  const named = [...table.keys()].filter((c) => sdk.has(c)).length;
  console.log(`spec ref                     : ${process.env.SPEC_REPO ? 'local checkout' : SPEC_REF}`);
  console.log(`registry codes in this SDK   : ${sdk.size}`);
  console.log(`named by the §2.4 table      : ${named}  (compared)`);
  console.log(
    `not named by §2.4            : ${sdk.size - named}  (the spec is silent; this gate says nothing about them)`,
  );

  if (problems.length > 0) {
    console.error(`\nMISMATCH — ${problems.length} code(s) disagree with the §2.4 status table:`);
    for (const p of problems) console.error(`  x ${p}`);
    console.error(
      "\nThe spec's table is the authority wherever it speaks. If the SDK value is the one\n" +
        'that is right, the change belongs in a spec PR against §2.4 — not here.',
    );
    process.exit(1);
  }

  console.log(`\nOK — all ${named} codes named by §2.4 carry the status the spec gives them.`);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
