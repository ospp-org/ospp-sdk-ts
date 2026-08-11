/**
 * Gate: the SDK error registry vs the SPEC error registry.
 *
 * Compares every code in OSPP_ERROR_REGISTRY against the registry table in the
 * spec's `spec/07-errors.md`, at the ref pinned in `.spec-ref`. Checks the three
 * properties the spec actually declares per code — `errorText`, `severity`,
 * `recoverable` — plus the code set itself, in both directions.
 *
 * `httpStatus` and `category` are deliberately NOT checked. The spec declines to
 * give a code either one (07-errors.md §4.4 is explicit that HTTP status is not
 * a property of a code, and category exists only as section headings), so both
 * are SDK extensions with nothing upstream to compare to. KNOWN-ISSUES tracks
 * the fact that the two SDKs invented different answers for them.
 *
 * ---
 *
 * **Why this gate exists.** A parity check between the two SDKs already existed
 * and it reported `recoverable` as "identical — 0 diffs". It was: both SDKs said
 * `5004 ELECTRICAL_SYSTEM` was recoverable, and had said so since before the
 * spec changed its mind. The spec made it non-recoverable in v0.8.0 as a safety
 * fix — a welded relay or a lost phase persists while the measured voltage reads
 * nominal, so a bay could return to service still energised — and eight releases
 * passed without either SDK noticing, because the only thing checking them was
 * each other. Two implementations that agree are not evidence; they are one
 * opinion held twice.
 *
 * The spec's own tooling would not have caught it either: `verify-protocol.sh`
 * scrapes the same table with a regex that captures code, name and severity, and
 * stops before the `Recoverable` column.
 *
 * Usage:
 *   npm run check:error-registry                              # clones spec at .spec-ref
 *   SPEC_REPO=/local/path npm run check:error-registry        # local checkout
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OSPP_ERROR_REGISTRY } from '../src/enums/OsppErrorCode.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_REF = readFileSync(join(ROOT, '.spec-ref'), 'utf8').trim();

// .spec-ref is PR-mutable and is passed to `git clone --branch`. execFileSync
// takes an argv array, so there is no shell to inject into — but a value
// beginning with `-` would still be read by git as an OPTION rather than a ref
// (e.g. `--upload-pack=...`). Validate against the same SemVer-tag allowlist
// the CI schemas job uses, before the value reaches any argv.
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

interface SpecRow {
  text: string;
  severity: string;
  recoverable: boolean;
}

try {
  const md = readFileSync(join(specRoot, 'spec', '07-errors.md'), 'utf8');

  // A §3 registry row. The `true|false` in column 4 is what distinguishes the
  // registry from Appendix A's quick-reference table, whose fourth column is a
  // category letter — so the narrower match is also the disambiguator.
  const ROW = /^\|\s*(\d{4})\s*\|\s*`([A-Z_]+)`\s*\|\s*(\w+)\s*\|\s*(true|false)\s*\|/;

  const spec = new Map<number, SpecRow>();
  for (const line of md.split(/\r?\n/)) {
    const m = ROW.exec(line);
    if (!m) continue;
    const code = Number(m[1]);
    if (spec.has(code)) {
      console.error(`ERROR: spec 07-errors.md lists code ${code} more than once`);
      process.exit(1);
    }
    spec.set(code, { text: m[2], severity: m[3], recoverable: m[4] === 'true' });
  }

  // A regex that silently matches nothing would make this gate pass vacuously
  // on any reformatting of the table. Refuse to be that gate.
  if (spec.size < 100) {
    console.error(
      `ERROR: parsed only ${spec.size} rows from spec/07-errors.md — the registry table format has probably changed. ` +
        'Refusing to report a pass; fix the parser in scripts/check-error-registry.ts.',
    );
    process.exit(1);
  }

  const sdk = new Map<number, SpecRow>();
  for (const entry of Object.values(OSPP_ERROR_REGISTRY)) {
    sdk.set(entry.code, {
      text: entry.text,
      severity: entry.severity,
      recoverable: entry.recoverable,
    });
  }

  const problems: string[] = [];

  for (const [code, s] of [...spec].sort((a, b) => a[0] - b[0])) {
    const o = sdk.get(code);
    if (!o) {
      problems.push(`${code} ${s.text}: in spec, MISSING from the SDK registry`);
      continue;
    }
    if (o.text !== s.text) problems.push(`${code}: errorText spec=${s.text} sdk=${o.text}`);
    if (o.severity !== s.severity) problems.push(`${code} ${s.text}: severity spec=${s.severity} sdk=${o.severity}`);
    if (o.recoverable !== s.recoverable) {
      problems.push(`${code} ${s.text}: recoverable spec=${s.recoverable} sdk=${o.recoverable}`);
    }
  }

  for (const [code, o] of [...sdk].sort((a, b) => a[0] - b[0])) {
    if (!spec.has(code)) problems.push(`${code} ${o.text}: in the SDK registry, MISSING from the spec`);
  }

  console.log(`spec ${SPEC_REF}: ${spec.size} codes    SDK registry: ${sdk.size} codes`);

  if (problems.length > 0) {
    console.error(`\nDRIFT between the SDK error registry and spec ${SPEC_REF} — ${problems.length} problem(s):\n`);
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      '\nFix: change the SDK to match the spec. The spec registry is the source of' +
        '\ntruth for errorText, severity and recoverable. If the SPEC is what is wrong,' +
        '\nfix it there first and re-pin .spec-ref — do not "correct" it here.',
    );
    process.exit(1);
  }

  console.log(`OK — all ${spec.size} codes agree with spec ${SPEC_REF} on errorText, severity and recoverable`);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
