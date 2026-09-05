/**
 * Gate: the SDK action enum vs the SPEC message catalog.
 *
 * Compares every member of `OsppAction` against the MQTT Quick Reference table
 * in the spec's `spec/03-messages.md`, at the ref pinned in `.spec-ref` — the
 * action NAMES in both directions, and the COUNT three ways.
 *
 * ---
 *
 * **Why this gate exists.** `OsppAction` is the enum the whole SDK is indexed
 * by — topics, envelopes, HMAC classification and every payload type hang off
 * it — and until this script it was the only registry in this package with
 * NOTHING comparing it to the spec. `07-errors.md` had `check-error-registry`,
 * `08-configuration.md` had `check-config-registry`, `schemas/` had
 * `check-schemas`, the conformance corpus had `check-vector-corpus`. Chapter 03
 * had a doc comment.
 *
 * That comment is how the hole surfaced. Its first line read *"All 27 MQTT
 * actions defined by the OSPP protocol v0.2.5"* while `.spec-ref` pinned
 * `v0.31.0` — twenty-nine minors of drift on a line no gate could see, because
 * no gate read this file at all. The 27 happened to still be right. Nothing
 * established that but coincidence, and a number that is right by coincidence
 * is indistinguishable, from inside a green run, from one that is wrong.
 *
 * **The count is checked THREE ways on purpose.** The spec states it twice —
 * once in the `### MQTT Messages (N actions)` heading and once by the number of
 * rows beneath it — and the SDK states it a third time in the enum. Comparing
 * only heading-to-enum would pass while the table drifted; comparing only
 * rows-to-enum would pass while the spec's own heading rotted, which is exactly
 * the defect this gate exists to catch, one repository upstream. Any two of the
 * three agreeing against the third is a real disagreement and is reported as
 * one.
 *
 * **`SessionEnded` is in the table and must stay checked from it.** It carries
 * `MSG-40` and sits between rows 10 and 11 because the first column is a
 * message-ID reference and not a row ordinal (`03-messages.md`, note under the
 * table). A parser that assumed the column ascends would silently stop there
 * and check 10 of 27 — so the column is not read at all, only the Action cell.
 * The SDK header used to say the enum came from *"Quick Reference + §5.4
 * SessionEnded"*, describing a spec layout in which the row was missing from
 * the table; it has not been missing for some time, and that clause was a
 * second, quieter piece of the same rot.
 *
 * Usage:
 *   npm run check:action-registry                              # clones spec at .spec-ref
 *   SPEC_REPO=/local/path npm run check:action-registry        # local checkout
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OsppAction } from '../src/actions/OsppAction.js';

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

/** The `### MQTT Messages (N actions)` heading that opens the Quick Reference table. */
const HEADING = /^###\s+MQTT Messages\s+\((\d+)\s+actions?\)\s*$/;

/**
 * One Quick Reference row. Only the Action cell is read — see the header note
 * on `SessionEnded`: the first column is an `MSG-0NN` reference and does not
 * ascend, so anchoring on it would truncate the parse at row 10 of 27.
 *
 * The cell is a Markdown link in every row at `v0.31.0`, but the bare form is
 * accepted too: a table that stops linking its own anchors is a formatting
 * change, not a registry change, and this gate must not report one as the other.
 */
const ROW = /^\|[^|]*\|\s*(?:\[\s*([A-Za-z][A-Za-z0-9]*)\s*\]\([^)]*\)|([A-Za-z][A-Za-z0-9]*))\s*\|/;

/**
 * Extract the MQTT action names from the Quick Reference section.
 *
 * Returns the heading's declared count alongside the rows so the caller can
 * compare the spec against itself. Scanning stops at the next `###` — the
 * section immediately after is `### BLE Messages (13 message types)`, whose
 * thirteen rows are NOT MQTT actions and whose accidental inclusion would put
 * this gate at 40 and make every future comparison meaningless.
 */
function parseQuickReference(md: string): { declared: number | null; actions: string[] } {
  const lines = md.split(/\r?\n/);
  let declared: number | null = null;
  const actions: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const h = HEADING.exec(line);
    if (h) {
      if (inSection) break; // a second MQTT heading: ambiguous, let the count check fail
      declared = Number(h[1]);
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (/^#{1,3}\s/.test(line)) break; // next section — BLE messages start here
    const m = ROW.exec(line);
    if (!m) continue;
    const name = m[1] ?? m[2];
    if (name === 'Action') continue; // the header row
    actions.push(name);
  }

  return { declared, actions };
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

try {
  // POSITIVE CONTROL, before any negative result is believed.
  //
  // Every check below reports absence — "no name is missing", "no count
  // disagrees" — and a parser that matches nothing reports exactly that, in the
  // same words, with rc=0. The threshold check further down catches a parser
  // that dies completely; it does not catch one that still matches but has
  // stopped seeing the shape that matters. So the parser is first run against a
  // synthetic table it MUST read correctly and a synthetic drift it MUST catch.
  // If the instrument cannot fail on demand, nothing it says about the real
  // spec is worth reading, and this exits non-zero without looking.
  const CONTROL = [
    '### MQTT Messages (3 actions)',
    '',
    '| MSG | Action | Direction |',
    '|--:|--------|-----------|',
    '| 1 | [Alpha](#1-alpha) | Station → Server |',
    '| 40 | [Bravo](#2-bravo) | Station → Server |',
    '| 2 | Charlie | Server → Station |',
    '',
    '### BLE Messages (2 message types)',
    '',
    '| MSG | Message | Direction |',
    '|--:|---------|-----------|',
    '| 27 | [Delta](#3-delta) | Station → App |',
    '| 28 | [Echo](#4-echo) | Station → App |',
  ].join('\n');

  const control = parseQuickReference(CONTROL);
  const controlOk =
    control.declared === 3 &&
    control.actions.join(',') === 'Alpha,Bravo,Charlie' && // linked and bare forms both read
    !control.actions.includes('Delta'); // the BLE section did not leak in

  if (!controlOk) {
    console.error(
      'ERROR: positive control FAILED — the Quick Reference parser did not read a table it was ' +
        'handed with the answer known.\n' +
        `  expected declared=3 actions=Alpha,Bravo,Charlie\n` +
        `  got      declared=${control.declared} actions=${control.actions.join(',') || '(none)'}\n` +
        'Refusing to report anything about the real spec: a parser that cannot read a control ' +
        'table cannot be trusted when it says the real one is clean.',
    );
    process.exit(1);
  }

  // The control must also FAIL on a planted drift, or "no drift" means nothing.
  const planted = parseQuickReference(CONTROL.replace('[Bravo](#2-bravo)', '[Bravni](#2-bravo)'));
  if (planted.actions.includes('Bravo') || !planted.actions.includes('Bravni')) {
    console.error(
      'ERROR: positive control FAILED — a planted one-character drift in an action name was not ' +
        'observed by the parser. The comparison below would be vacuous.',
    );
    process.exit(1);
  }
  console.log('positive control: parser read a known table and observed a planted drift — OK');

  const md = readFileSync(join(specRoot, 'spec', '03-messages.md'), 'utf8');
  const { declared, actions } = parseQuickReference(md);

  if (declared === null) {
    console.error(
      `ERROR: no '### MQTT Messages (N actions)' heading found in spec/03-messages.md at ${SPEC_REF}. ` +
        'The Quick Reference section has been renamed or restructured — fix the parser in ' +
        'scripts/check-action-registry.ts. Refusing to report a pass.',
    );
    process.exit(1);
  }

  // A regex that silently matches nothing would make this gate pass vacuously
  // on any reformatting of the table. Refuse to be that gate.
  if (actions.length < 20) {
    console.error(
      `ERROR: parsed only ${actions.length} rows from the Quick Reference table in spec/03-messages.md — ` +
        'the table format has probably changed. Refusing to report a pass; fix the parser in ' +
        'scripts/check-action-registry.ts.',
    );
    process.exit(1);
  }

  const dupes = actions.filter((a, i) => actions.indexOf(a) !== i);
  if (dupes.length > 0) {
    console.error(`ERROR: spec 03-messages.md lists these actions more than once: ${[...new Set(dupes)].join(', ')}`);
    process.exit(1);
  }

  const spec = new Set(actions);
  const sdk = new Set<string>(Object.values(OsppAction));

  const problems: string[] = [];

  for (const name of [...spec].sort()) {
    if (!sdk.has(name)) problems.push(`${name}: in the spec Quick Reference, MISSING from OsppAction`);
  }
  for (const name of [...sdk].sort()) {
    if (!spec.has(name)) problems.push(`${name}: in OsppAction, MISSING from the spec Quick Reference`);
  }

  // The three-way count check. Stated separately from the name comparison
  // because they fail for different reasons and a reader needs to know which:
  // a name mismatch is a rename or an addition, a heading/rows mismatch is the
  // spec disagreeing with itself and belongs upstream, not here.
  if (declared !== actions.length) {
    problems.push(
      `count: the spec heading declares ${declared} actions but ${actions.length} rows follow it — ` +
        'the spec disagrees with itself; fix it in ospp-org/spec, not here',
    );
  }
  if (actions.length !== sdk.size) {
    problems.push(`count: spec table has ${actions.length} actions, OsppAction has ${sdk.size} members`);
  }

  // The enum's own doc comment states the count in prose. It is the line this
  // gate was written for: it carried a false protocol version for twenty-nine
  // minors precisely because prose is not executable. The number stays in the
  // comment — a reader opening the file deserves it — but it is now DERIVED, in
  // the only sense that survives: it is compared, on every run, to the spec.
  const enumSrc = readFileSync(join(ROOT, 'src', 'actions', 'OsppAction.ts'), 'utf8');
  const claim = enumSrc.match(/All (\d+) MQTT actions/g) ?? [];
  if (claim.length !== 1) {
    problems.push(
      `doc comment: expected exactly one "All N MQTT actions" claim in src/actions/OsppAction.ts, found ${claim.length}. ` +
        'A claim that has been deleted is not a claim that passes — this gate reads that line and ' +
        'cannot check what is no longer there.',
    );
  } else {
    const claimed = Number(/All (\d+) MQTT actions/.exec(claim[0])![1]);
    if (claimed !== actions.length) {
      problems.push(
        `doc comment: src/actions/OsppAction.ts says "All ${claimed} MQTT actions", spec ${SPEC_REF} has ${actions.length}`,
      );
    }
  }

  console.log(
    `spec ${SPEC_REF}: heading declares ${declared}, table has ${actions.length} rows    ` +
      `OsppAction: ${sdk.size} members`,
  );

  if (problems.length > 0) {
    console.error(`\nDRIFT between OsppAction and spec ${SPEC_REF} — ${problems.length} problem(s):\n`);
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      '\nFix: change the SDK to match the spec. `03-messages.md` is the source of truth for the' +
        '\naction set. If the SPEC is what is wrong, fix it there first and re-pin .spec-ref —' +
        '\ndo not "correct" it here.',
    );
    process.exit(1);
  }

  console.log(`OK — all ${actions.length} MQTT actions agree between OsppAction and spec ${SPEC_REF}`);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
