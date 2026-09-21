/**
 * Gate: the SDK action enum vs the SPEC message catalog.
 *
 * Compares every member of `OsppAction` against the MQTT Quick Reference table
 * in the spec's `spec/03-messages.md`, at the ref pinned in `.spec-ref` — the
 * action NAMES in both directions, the DIRECTION and TYPE cell of every row in
 * both directions, and the COUNT three ways.
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
 * **The Direction and Type columns used to be read by nothing.** The sentence
 * above this one said so: *"the column is not read at all, only the Action
 * cell"*. That was written about the MSG column and was true of the other four
 * as well, and two of them carry routing. Their only reader in this package was
 * `tests/actions/OsppAction.test.ts`, where six lists transcribed from those
 * two columns sat as local `const` arrays with nothing above them — a
 * transcription that agreed with itself, which is the shape of the
 * `OsppErrorCode.test.ts` finding and of the `ConfigKey.test.ts` one before it.
 * The six lists are now exported from `src/actions/OsppAction.ts`, the test
 * imports them, and this gate compares them to the two columns at the pinned
 * ref, in both directions.
 *
 * **The mapping is one literal to one list.** Measured at `v0.42.0`, Direction
 * holds four distinct strings over its 27 rows — `Station → Server` (11),
 * `Server → Station` (14), `Bidirectional` (1) and `Broker → Server, or Station
 * → Server` (1) — and Type holds two, `REQ/RES` (20) and `EVENT` (7). This SDK
 * keeps a separate list for each, so nothing is projected and nothing is
 * folded: `DataTransfer` is in the bidirectional list and in neither direction
 * list, `ConnectionLost` is in the broker list and not in the station list. The
 * PHP SDK exposes two direction accessors rather than four and has to project
 * the same four literals onto them; the two gates therefore compare the same
 * column at different resolutions, and this is the finer of the two.
 *
 * **An unknown literal is refused, never skipped.** A Direction or Type string
 * `DIRECTION_BUCKETS` or `TYPE_BUCKETS` has no case for would fall out of both
 * sides of the comparison and be reported as agreement — the exact way a gate
 * goes quietly blind. So would a row whose Direction or Type cell had gone
 * missing, and so would a parse in which no row carried either cell. All three
 * exit non-zero without reporting a verdict.
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
import {
  OsppAction,
  STATION_TO_SERVER_ACTIONS,
  SERVER_TO_STATION_ACTIONS,
  BROKER_TO_SERVER_ACTIONS,
  BIDIRECTIONAL_ACTIONS,
  EVENT_ACTIONS,
  REQ_RES_ACTIONS,
} from '../src/actions/OsppAction.js';

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
 * Column offsets into a Quick Reference row once it is split on the pipe.
 *
 * `| MSG | Action | Direction | Type | ... |` splits to `['', ' MSG ',
 * ' Action ', ' Direction ', ' Type ', ..., '']` — the empty leading element is
 * the text before the first pipe, so the first real cell is at 1 and MSG holds
 * it.
 *
 * Direction and Type are taken by SPLITTING rather than by widening `ROW`. A
 * wider regex that demanded four cells would simply fail to match a row that
 * had lost one; the row would vanish from the parse and the loss would surface
 * as a count disagreement, which reads as a rename or a deletion and is
 * neither. Splitting keeps the row so the completeness check can name it.
 */
const COL_ACTION = 2;
const COL_DIRECTION = 3;
const COL_TYPE = 4;

/** One parsed Quick Reference row. `null` means the cell was not there at all. */
interface QuickRefRow {
  action: string;
  actionCell: string;
  direction: string | null;
  type: string | null;
}

/**
 * The bucket in `src/actions/OsppAction.ts` each Direction literal routes to,
 * one literal to one list. A literal absent from this table is refused, not
 * ignored.
 */
const DIRECTION_BUCKETS: Record<string, string> = {
  'Station → Server': 'STATION_TO_SERVER_ACTIONS',
  'Server → Station': 'SERVER_TO_STATION_ACTIONS',
  Bidirectional: 'BIDIRECTIONAL_ACTIONS',
  'Broker → Server, or Station → Server': 'BROKER_TO_SERVER_ACTIONS',
};

/** The same, for the Type column. */
const TYPE_BUCKETS: Record<string, string> = {
  'REQ/RES': 'REQ_RES_ACTIONS',
  EVENT: 'EVENT_ACTIONS',
};

/** The live lists, keyed by the names used above. */
const SDK_BUCKETS: Record<string, readonly OsppAction[]> = {
  STATION_TO_SERVER_ACTIONS,
  SERVER_TO_STATION_ACTIONS,
  BIDIRECTIONAL_ACTIONS,
  BROKER_TO_SERVER_ACTIONS,
  REQ_RES_ACTIONS,
  EVENT_ACTIONS,
};

/** Which column a bucket answers to, so a failure says which cell moved. */
const BUCKET_COLUMN: Record<string, string> = {
  STATION_TO_SERVER_ACTIONS: 'Direction',
  SERVER_TO_STATION_ACTIONS: 'Direction',
  BIDIRECTIONAL_ACTIONS: 'Direction',
  BROKER_TO_SERVER_ACTIONS: 'Direction',
  REQ_RES_ACTIONS: 'Type',
  EVENT_ACTIONS: 'Type',
};

/**
 * Trim a table cell and collapse its internal whitespace. A Markdown table is
 * free to re-pad its columns, and a re-flow is a formatting change; this gate
 * must not report one as a routing change, so cells are compared normalised.
 */
function normalizeCell(cell: string): string {
  return cell.replace(/\s+/g, ' ').trim();
}

/**
 * Extract the MQTT action names from the Quick Reference section.
 *
 * Returns the heading's declared count alongside the rows so the caller can
 * compare the spec against itself. Scanning stops at the next `###` — the
 * section immediately after is `### BLE Messages (13 message types)`, whose
 * thirteen rows are NOT MQTT actions and whose accidental inclusion would put
 * this gate at 40 and make every future comparison meaningless.
 */
function parseQuickReference(md: string): {
  declared: number | null;
  actions: string[];
  rows: QuickRefRow[];
} {
  const lines = md.split(/\r?\n/);
  let declared: number | null = null;
  const actions: string[] = [];
  const rows: QuickRefRow[] = [];
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

    const cells = line.replace(/\s+$/, '').split('|');
    rows.push({
      action: name,
      // The row is read twice — by ROW and by the split — and the two must land
      // on the same column. Recorded so a column inserted before Action is
      // caught against the REAL table; the synthetic control below has a fixed
      // layout and cannot see that happen.
      actionCell: cells[COL_ACTION] === undefined ? '' : normalizeCell(cells[COL_ACTION]),
      direction:
        cells[COL_DIRECTION] === undefined ? null : normalizeCell(cells[COL_DIRECTION]) || null,
      type: cells[COL_TYPE] === undefined ? null : normalizeCell(cells[COL_TYPE]) || null,
    });
  }

  return { declared, actions, rows };
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
  //
  // The control carries all four Direction literals and both Type literals: a
  // control that exercises one value per column proves the column is reachable,
  // not that the value on the page is what reaches the comparison.
  const CONTROL = [
    '### MQTT Messages (4 actions)',
    '',
    '| MSG | Action | Direction | Type | Category | Timeout |',
    '|--:|--------|-----------|------|----------|--------:|',
    '| 1 | [Alpha](#1-alpha) | Station → Server | REQ/RES | Core | 30s |',
    '| 40 | [Bravo](#2-bravo) | Broker → Server, or Station → Server | EVENT | Core | — |',
    '| 2 | Charlie | Server → Station | REQ/RES | Core | 5s |',
    '| 3 | [Delta](#3-delta) | Bidirectional | REQ/RES | Core | 30s |',
    '',
    '### BLE Messages (2 message types)',
    '',
    '| MSG | Message | Direction | Characteristic | Category |',
    '|--:|---------|-----------|----------------|----------|',
    '| 27 | [Echo](#4-echo) | Station → App | Notify | Core |',
    '| 28 | [Foxtrot](#5-foxtrot) | Station → App | Notify | Core |',
  ].join('\n');

  const cellReport = (rows: QuickRefRow[], pick: (r: QuickRefRow) => string | null): string =>
    rows.map((r) => `${r.action}=${pick(r) ?? '(absent)'}`).join('; ');

  const control = parseQuickReference(CONTROL);
  const EXPECT_DIRECTIONS =
    'Alpha=Station → Server; Bravo=Broker → Server, or Station → Server; ' +
    'Charlie=Server → Station; Delta=Bidirectional';
  const EXPECT_TYPES = 'Alpha=REQ/RES; Bravo=EVENT; Charlie=REQ/RES; Delta=REQ/RES';
  const gotDirections = cellReport(control.rows, (r) => r.direction);
  const gotTypes = cellReport(control.rows, (r) => r.type);

  const controlOk =
    control.declared === 4 &&
    control.actions.join(',') === 'Alpha,Bravo,Charlie,Delta' && // linked and bare forms both read
    !control.actions.includes('Echo') && // the BLE section did not leak in
    gotDirections === EXPECT_DIRECTIONS &&
    gotTypes === EXPECT_TYPES;

  if (!controlOk) {
    console.error(
      'ERROR: positive control FAILED — the Quick Reference parser did not read a table it was ' +
        'handed with the answer known.\n' +
        `  expected declared=4 actions=Alpha,Bravo,Charlie,Delta\n` +
        `           directions ${EXPECT_DIRECTIONS}\n` +
        `           types      ${EXPECT_TYPES}\n` +
        `  got      declared=${control.declared} actions=${control.actions.join(',') || '(none)'}\n` +
        `           directions ${gotDirections || '(none)'}\n` +
        `           types      ${gotTypes || '(none)'}\n` +
        'Refusing to report anything about the real spec: a parser that cannot read a control ' +
        'table cannot be trusted when it says the real one is clean.',
    );
    process.exit(1);
  }

  // The control must also FAIL on a planted drift, or "no drift" means nothing.
  // One plant per cell that is read, because a parser can reach a column and
  // still be pinned to a constant.
  const planted = parseQuickReference(CONTROL.replace('[Bravo](#2-bravo)', '[Bravni](#2-bravo)'));
  if (planted.actions.includes('Bravo') || !planted.actions.includes('Bravni')) {
    console.error(
      'ERROR: positive control FAILED — a planted one-character drift in an action name was not ' +
        'observed by the parser. The comparison below would be vacuous.',
    );
    process.exit(1);
  }

  const flippedDir = parseQuickReference(
    CONTROL.replace('| 2 | Charlie | Server → Station |', '| 2 | Charlie | Station → Server |'),
  );
  const charlieDir = flippedDir.rows.find((r) => r.action === 'Charlie')?.direction ?? null;
  if (charlieDir !== 'Station → Server') {
    console.error(
      "ERROR: positive control FAILED — a planted flip of a row's Direction cell was not observed " +
        `by the parser (read ${charlieDir === null ? '(absent)' : `'${charlieDir}'`} where ` +
        "'Station → Server' was planted). The Direction comparison below would be vacuous.",
    );
    process.exit(1);
  }

  const flippedType = parseQuickReference(
    CONTROL.replace(
      '| 1 | [Alpha](#1-alpha) | Station → Server | REQ/RES |',
      '| 1 | [Alpha](#1-alpha) | Station → Server | EVENT |',
    ),
  );
  const alphaType = flippedType.rows.find((r) => r.action === 'Alpha')?.type ?? null;
  if (alphaType !== 'EVENT') {
    console.error(
      "ERROR: positive control FAILED — a planted flip of a row's Type cell was not observed by " +
        `the parser (read ${alphaType === null ? '(absent)' : `'${alphaType}'`} where 'EVENT' was ` +
        'planted). The Type comparison below would be vacuous.',
    );
    process.exit(1);
  }

  // And the refusal arm itself: a row STRIPPED of its two cells must come back
  // null, or the completeness check further down can never fire and the promise
  // to refuse rather than pass is a promise nothing keeps.
  const stripped = parseQuickReference(
    CONTROL.replace(
      '| 3 | [Delta](#3-delta) | Bidirectional | REQ/RES | Core | 30s |',
      '| 3 | [Delta](#3-delta) |',
    ),
  );
  const deltaRow = stripped.rows.find((r) => r.action === 'Delta');
  if (deltaRow === undefined || deltaRow.direction !== null || deltaRow.type !== null) {
    console.error(
      'ERROR: positive control FAILED — a row stripped of its Direction and Type cells was not ' +
        'reported as missing them. The completeness check below cannot fire, so this gate cannot ' +
        'keep its promise to refuse a verdict rather than pass on a table it stopped reading.',
    );
    process.exit(1);
  }

  console.log(
    'positive control: parser read a known table, observed planted drifts in the Action, ' +
      'Direction and Type cells, and reported a stripped row as incomplete — OK',
  );

  const md = readFileSync(join(specRoot, 'spec', '03-messages.md'), 'utf8');
  const { declared, actions, rows } = parseQuickReference(md);

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

  // The two parses of each row must agree on which column holds the action, or
  // Direction and Type are being read from the wrong cells. The synthetic
  // control has a fixed layout and cannot catch a column inserted upstream.
  const misaligned = rows.filter((r) => !r.actionCell.includes(r.action));
  if (misaligned.length > 0) {
    console.error(
      `ERROR: ${misaligned.length} of ${rows.length} rows disagree about which column holds the ` +
        'action — the regex and the cell split landed on different columns, so Direction and Type ' +
        'are being read from the wrong cells:\n' +
        misaligned
          .map((r) => `  matched '${r.action}' but column ${COL_ACTION} holds '${r.actionCell}'`)
          .join('\n') +
        '\nRefusing to report a pass; fix the COL_* offsets in scripts/check-action-registry.ts.',
    );
    process.exit(1);
  }

  // Non-vacuity for the two new columns, in the same shape as the row floor
  // above. A table whose Direction column has been renamed, moved or dropped
  // would otherwise leave every row unclassified, every expected bucket empty,
  // and every comparison below reporting no difference — a green run over a
  // column nobody reads any more.
  const withDirection = rows.filter((r) => r.direction !== null);
  const withType = rows.filter((r) => r.type !== null);
  if (withDirection.length === 0 || withType.length === 0) {
    console.error(
      `ERROR: parsed ${rows.length} rows from the Quick Reference table but ${withDirection.length} ` +
        `carried a Direction cell and ${withType.length} carried a Type cell. The column layout of ` +
        'spec/03-messages.md has changed. Refusing to report a pass: a comparison against columns ' +
        'that are no longer being read reports agreement for every row.',
    );
    process.exit(1);
  }

  const incomplete = rows.filter((r) => r.direction === null || r.type === null);
  if (incomplete.length > 0) {
    console.error(
      `ERROR: ${incomplete.length} of ${rows.length} Quick Reference rows are missing a Direction ` +
        'or a Type cell:\n' +
        incomplete
          .map(
            (r) =>
              `  ${r.action}: direction=${r.direction ?? '(absent)'} type=${r.type ?? '(absent)'}`,
          )
          .join('\n') +
        '\nRefusing to report a pass; fix the parser in scripts/check-action-registry.ts.',
    );
    process.exit(1);
  }

  const unknownDirections = [...new Set(rows.map((r) => r.direction!))].filter(
    (d) => DIRECTION_BUCKETS[d] === undefined,
  );
  const unknownTypes = [...new Set(rows.map((r) => r.type!))].filter(
    (t) => TYPE_BUCKETS[t] === undefined,
  );
  if (unknownDirections.length > 0 || unknownTypes.length > 0) {
    const who = (literal: string, pick: (r: QuickRefRow) => string | null): string =>
      rows
        .filter((r) => pick(r) === literal)
        .map((r) => r.action)
        .join(', ');
    console.error(
      'ERROR: the Quick Reference uses a Direction or Type literal this gate has no case for.\n' +
        unknownDirections
          .map((d) => `  Direction '${d}' (${who(d, (r) => r.direction)}) is not in DIRECTION_BUCKETS`)
          .concat(
            unknownTypes.map(
              (t) => `  Type '${t}' (${who(t, (r) => r.type)}) is not in TYPE_BUCKETS`,
            ),
          )
          .join('\n') +
        '\nRefusing to report a pass. An unmapped literal drops its rows out of BOTH sides of the ' +
        'comparison, which reads as agreement. Decide which list in src/actions/OsppAction.ts the ' +
        'new literal belongs to, add the case, and re-run — do not let it fall through.',
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

  // ── the Direction and Type columns vs the six routing lists ───────────────
  //
  // The expected membership of each list is BUILT from the catalogue rows, so
  // there is no hand-written list on this side of the comparison to fall out of
  // date. Both directions are reported, and separately, because they mean
  // different things: a name the spec routes one way and the SDK does not carry
  // there is an SDK that would publish on the wrong topic, while a name the SDK
  // routes and the spec does not list is a list that has outlived its row.
  const expectedBuckets: Record<string, string[]> = {};
  for (const bucket of Object.keys(SDK_BUCKETS)) expectedBuckets[bucket] = [];
  for (const r of rows) {
    expectedBuckets[DIRECTION_BUCKETS[r.direction!]].push(r.action);
    expectedBuckets[TYPE_BUCKETS[r.type!]].push(r.action);
  }

  for (const [bucket, expected] of Object.entries(expectedBuckets)) {
    const actual = SDK_BUCKETS[bucket] as readonly string[];
    const column = BUCKET_COLUMN[bucket];

    const inner = [...new Set(actual.filter((a, i) => actual.indexOf(a) !== i))];
    if (inner.length > 0) {
      problems.push(`${bucket} lists ${inner.join(', ')} more than once`);
    }

    for (const name of expected) {
      if (!actual.includes(name)) {
        problems.push(
          `${column}: spec ${SPEC_REF} routes ${name} into ${bucket}, MISSING from ${bucket}`,
        );
      }
    }
    for (const name of actual) {
      if (!expected.includes(name)) {
        problems.push(
          `${column}: ${bucket} lists ${name}, but spec ${SPEC_REF} does not route it there`,
        );
      }
    }
    const expectedSize = new Set(expected).size;
    const actualSize = new Set(actual).size;
    if (expectedSize !== actualSize) {
      problems.push(
        `count: spec ${SPEC_REF} routes ${expectedSize} actions into ${bucket}, ${bucket} has ${actualSize}`,
      );
    }
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

  const tally = (pick: (r: QuickRefRow) => string | null): string => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const k = pick(r) ?? '(absent)';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts].map(([k, v]) => `${k}=${v}`).join(', ');
  };

  console.log(
    `spec ${SPEC_REF}: heading declares ${declared}, table has ${actions.length} rows    ` +
      `OsppAction: ${sdk.size} members`,
  );
  console.log(`  Direction over ${rows.length} rows: ${tally((r) => r.direction)}`);
  console.log(`  Type over ${rows.length} rows: ${tally((r) => r.type)}`);
  console.log(
    '  against the SDK lists: ' +
      Object.entries(expectedBuckets)
        .map(([b, e]) => `${b}=${new Set(e).size}`)
        .join(', '),
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

  console.log(
    `OK — all ${actions.length} MQTT actions agree between OsppAction and spec ${SPEC_REF} by name, ` +
      'Direction and Type',
  );
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
