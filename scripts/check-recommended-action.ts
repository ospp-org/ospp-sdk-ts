/**
 * Gate: every registry code has a corrective action, and the action is not a placeholder.
 *
 * This SDK carried NO corrective actions at all before 0.28.0 — `OsppErrorMeta`
 * had no such member and no accessor existed — while `ospp-sdk-php` carried
 * eleven of the 118. That eleven was once read as the registry being incomplete.
 * It is not: `07-errors.md` §3 gives a *Recommended Action* for 118 of 118 rows
 * and no cell is empty. The hole was on the SDK side, and nothing could see it —
 * `check-error-registry.ts` compares `errorText`, `severity` and `recoverable`
 * and stops there, so a missing column sat behind a green gate.
 *
 * ---
 *
 * **WHY THIS GATE IS NOT A DIFF, AND MUST NOT BE ONE.**
 *
 * The obvious check — compare each transcription to its registry cell — is the
 * one §1.4 expressly forbids:
 *
 * > That equality is on the **corrective action, not on the bytes** […]
 * > Byte-identity is not achievable in any case, since translation is expressly
 * > permitted, so a conformance test **MUST NOT** assert it.
 *
 * A gate built as a diff would therefore violate the section it exists to
 * enforce, and it would be wrong in practice as well as on paper. Both halves of
 * that were measured on the eleven arms the PHP SDK already had, and they came
 * out opposite ways:
 *
 *   - `4020` had been reworded to fit the 500-char bound and still said exactly
 *     what the cell says. §1.4 permits precisely that. A diff would have failed
 *     it — a false red on a conforming value.
 *   - `4010` had NOT stayed equivalent. The cell says an absent `details.phase`
 *     means `retry` on REST but `renewal` on SignCertificate [MSG-022]; that SDK
 *     said `retry` unconditionally, the opposite recovery on the renewal path
 *     (`renewal` regenerates the keypair, `retry` must not). A diff would have
 *     caught it — for the wrong reason, indistinguishably from the false red
 *     above.
 *
 * A gate that cannot tell those two apart is not a gate. So this one asserts only
 * properties that SURVIVE A TRANSLATION, which is the question §1.4 leaves open:
 * what is mechanically checkable, if not identity?
 *
 *   1. COVERAGE       — every §3 code has a non-empty action. The load-bearing one.
 *   2. NO ORPHANS     — no action for a code §3 does not list.
 *   3. WIRE BOUND     — 1..500, the `recommendedAction` bound of Appendix C.
 *   4. DISTINCTNESS   — no two codes share one string. This is how the substitution
 *                       §1.4 forbids actually presents: a generic value derived from
 *                       `severity` or `recoverable` collapses many codes onto few
 *                       strings. Distinctness catches it without reading the prose.
 *   5. NO PLACEHOLDER — the exact form §1.4 names as non-conforming.
 *   6. DISCRIMINATOR  — where the cell names a `details.<member>`, the action names
 *                       the same member. §1.4 requires a branching entry to name the
 *                       member that selects the branch and be "emitted in full". A
 *                       JSON member name is not translatable, so requiring it is not
 *                       requiring content.
 *   7. CODE REFS      — a four-digit code the cell cites is a normative cross-
 *                       reference to another registry row; it survives translation
 *                       for the same reason.
 *   8. PARTIES        — where the cell addresses N parties (`Station: … Server: …`),
 *                       the action still addresses N. §1.4: the value "MUST preserve
 *                       the part addressed to the receiver and MAY carry the rest". A
 *                       library cannot know which party is the receiver, so the only
 *                       way it can guarantee the receiver's part is present is to
 *                       carry every part.
 *
 *                       This counts ADDRESSED SEGMENTS and does not read the labels,
 *                       and the difference is not pedantry — it was measured. The
 *                       first draft required the literal word: `Station:` in the cell
 *                       had to be `Station:` in the action. Run against a Romanian
 *                       rendering of `4018` that keeps every protocol token, that
 *                       draft FAILED it — which is a conformance test rejecting a
 *                       translation, exactly the thing §1.4 forbids, arriving through
 *                       a check that never mentions bytes. Counting segments passes
 *                       the same translation and still fails when a part is dropped.
 *                       A label is prose; that a part is addressed at all is structure.
 *
 * None of the eight compares an action to a cell. Proven, not asserted: rewriting
 * an arm's prose end to end while keeping its tokens and party labels leaves this
 * gate green — see `tests/enums/RecommendedActionGate.test.ts`, which performs
 * exactly that rewrite and would fail if this gate had a diff hidden in it.
 *
 * This is the mirror of `ospp-sdk-php`'s `scripts/check-recommended-action.php`;
 * the eight checks, the floors and the failure text are the same on both sides.
 *
 * Usage:
 *   npm run check:recommended-action                          # clones the pinned ref
 *   SPEC_REPO=/local/path npm run check:recommended-action    # local checkout
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECOMMENDED_ACTION } from '../src/enums/RecommendedAction.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_REF = readFileSync(join(ROOT, '.spec-ref'), 'utf8').trim();

// .spec-ref is PR-mutable and is passed to `git clone --branch`. execFileSync
// takes an argv array, so there is no shell to inject into — but a value
// beginning with `-` would still be read by git as an OPTION rather than a ref.
// Validate against the same SemVer-tag allowlist the CI schemas job uses.
if (!/^v\d+\.\d+\.\d+(-[a-zA-Z0-9._-]+)?$/.test(SPEC_REF)) {
  console.error(
    `ERROR: .spec-ref value '${SPEC_REF}' does not match SemVer tag pattern (v<MAJOR>.<MINOR>.<PATCH>[-prerelease])`,
  );
  process.exit(1);
}

/**
 * A §3 registry row, captured through the *Recommended Action* column.
 *
 * The first four columns are matched exactly as `check-error-registry.ts` matches
 * them — the `true|false` in column 4 is what tells a §3 row from Appendix A's
 * quick-reference row, whose fourth column is a category letter. The greedy `(.*)`
 * then runs to the LAST pipe on the line, so the trailing field is the action.
 *
 * That is deliberate rather than a `split('|')`: a *Description* cell may contain
 * a pipe inside a code span, which would shift every field after it. No *Recommended
 * Action* cell contains one — verified across all 118 at the pinned ref — so anchoring on
 * the last pipe is correct whatever the earlier columns hold.
 */
const ROW = /^\|\s*(\d{4})\s*\|\s*`([A-Z_]+)`\s*\|\s*\w+\s*\|\s*(?:true|false)\s*\|(.*)\|\s*$/;

/** The floor below which a parse is treated as broken rather than as a small registry. */
const MIN_ROWS = 100;

/** Appendix C — `recommendedAction`: `"minLength": 1, "maxLength": 500`. */
const MIN_LEN = 1;
const MAX_LEN = 500;

/**
 * The party vocabulary §1.4 has in mind when it says an entry may address "more
 * than one party". Enumerated from the registry rather than guessed: these are
 * every `Word:` label that occurs in an action cell at the pinned ref.
 *
 * Used on the CELL side only, where the language is known to be the spec's own.
 */
const PARTY_VOCAB = 'Station|Server|Operator|Sender|Receiver|App|Web app|Web|Browser|User|Client';

/**
 * One ADDRESSED SEGMENT in a registry cell. `Server/Operator:` is one segment
 * naming two parties, not two segments — 5017 and 5024 are the rows that make the
 * difference, and counting names there would demand a part the cell never separated.
 */
const CELL_SEGMENT = new RegExp(`\\*{0,2}(?:${PARTY_VOCAB})(?:\\s*/\\s*(?:${PARTY_VOCAB}))*\\*{0,2}\\s*:`, 'g');

/**
 * The SHAPE of an addressed segment, for the action side, which may be in any
 * language: a capitalised label (optionally slash-joined, optionally two words) and
 * a colon. Code spans are removed first so `type: "OfflinePassRejected"` is not read
 * as an address.
 */
const ACTION_SEGMENT = /(?:^|(?<=[.!?;)\s]))\*{0,2}[A-Z][\w-]*(?:\s*\/\s*[A-Z][\w-]*)*(?: [a-z][\w-]*)?\*{0,2}\s*:/g;

const countMatches = (text: string, re: RegExp): number => (text.match(re) ?? []).length;

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
  const registryPath = join(specRoot, 'spec', '07-errors.md');
  const md = readFileSync(registryPath, 'utf8');

  const spec = new Map<number, { text: string; action: string }>();
  for (const line of md.split(/\r?\n/)) {
    const m = ROW.exec(line);
    if (!m) continue;

    const code = Number(m[1]);
    const rest = m[3];
    // Everything after the last remaining pipe is the action cell.
    const cut = rest.lastIndexOf('|');
    const action = (cut === -1 ? rest : rest.slice(cut + 1)).trim();

    if (spec.has(code)) {
      console.error(`ERROR: spec 07-errors.md lists code ${code} more than once`);
      process.exit(1);
    }
    spec.set(code, { text: m[2], action });
  }

  // -------------------------------------------------------------------------
  // ANTI-VACUITY. Before any comparison, because every one of the eight checks
  // below passes trivially over an empty set. A reformatted table, a moved file
  // or a tightened regex must land as a failure, never as "all 0 codes agree".
  // -------------------------------------------------------------------------

  if (spec.size < MIN_ROWS) {
    console.error(`ERROR: parsed only ${spec.size} rows from §3 of ${registryPath}; expected at least ${MIN_ROWS}`);
    console.error('This is a broken parse, not a small registry. The gate reports nothing rather than a pass.');
    process.exit(1);
  }

  const emptyCells = [...spec].filter(([, r]) => r.action === '').map(([c]) => c);
  if (emptyCells.length > 0) {
    console.error(`ERROR: §3 has an EMPTY Recommended Action cell for: ${emptyCells.join(', ')}`);
    process.exit(1);
  }

  const sdk = new Map<number, string>();
  for (const [key, action] of Object.entries(RECOMMENDED_ACTION)) {
    sdk.set(Number(key), action);
  }

  if (sdk.size === 0) {
    console.error('ERROR: the SDK produced no recommendedAction at all — refusing to report a pass over an empty set');
    process.exit(1);
  }

  const problems: string[] = [];
  const report = (rule: string, code: number, detail: string): void => {
    problems.push(`${rule.padEnd(14)} ${String(code).padStart(4)}  ${detail}`);
  };

  // -------------------------------------------------------------------------
  // 1 COVERAGE · 3 WIRE BOUND · 5 NO PLACEHOLDER · 6 DISCRIMINATOR · 7 CODE REFS · 8 PARTIES
  // -------------------------------------------------------------------------

  let covered = 0;

  for (const [code, row] of [...spec].sort((a, b) => a[0] - b[0])) {
    const action = sdk.get(code);

    if (action === undefined || action.trim() === '') {
      report('COVERAGE', code, `${row.text} — §3 gives an action, this SDK gives none`);
      continue;
    }
    covered++;

    const len = [...action].length;
    if (len < MIN_LEN || len > MAX_LEN) {
      report('WIRE-BOUND', code, `${row.text} — ${len} characters, outside Appendix C's ${MIN_LEN}..${MAX_LEN}`);
    }

    // The exact string §1.4 names as non-conforming, and anything that is only it.
    if (/^\W*review the error details and take corrective action\W*$/i.test(action)) {
      report('PLACEHOLDER', code, `${row.text} — §1.4 names this exact string as not conforming`);
    }

    // 6 — every `details.<member>` the cell names must survive into the action.
    for (const member of new Set([...row.action.matchAll(/`(details\.[A-Za-z][A-Za-z0-9_]*)`/g)].map((m) => m[1]))) {
      if (!action.includes(member)) {
        report('DISCRIMINATOR', code, `${row.text} — cell selects a branch on \`${member}\`; the action does not name it`);
      }
    }

    // 7 — a four-digit code the cell cites is a cross-reference to another row.
    for (const ref of new Set([...row.action.matchAll(/`(\d{4})`/g)].map((m) => m[1]))) {
      if (!action.includes(ref)) {
        report('CODE-REF', code, `${row.text} — cell cites code \`${ref}\`; the action does not`);
      }
    }

    // 8 — the addressing structure, counted rather than named, so a translated
    // label still counts and a dropped part still does not.
    const wantSegments = countMatches(row.action, CELL_SEGMENT);
    if (wantSegments > 0) {
      const haveSegments = countMatches(action.replace(/`[^`]*`/g, ' '), ACTION_SEGMENT);
      if (haveSegments < wantSegments) {
        report('PARTY', code, `${row.text} — cell addresses ${wantSegments} part(s), the action addresses ${haveSegments}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2 NO ORPHANS
  // -------------------------------------------------------------------------

  for (const code of [...sdk.keys()].sort((a, b) => a - b)) {
    if (!spec.has(code)) {
      report('ORPHAN', code, 'this SDK carries an action for a code §3 does not list');
    }
  }

  // -------------------------------------------------------------------------
  // 4 DISTINCTNESS — how a generic substitution presents, without reading the prose.
  // -------------------------------------------------------------------------

  const seen = new Map<string, number[]>();
  for (const [code, action] of sdk) {
    const bucket = seen.get(action);
    if (bucket) bucket.push(code);
    else seen.set(action, [code]);
  }
  for (const codes of seen.values()) {
    if (codes.length > 1) {
      report(
        'DISTINCT',
        codes[0],
        `shares one action string with ${codes.slice(1).join(', ')} — §1.4 forbids a value derived from severity/recoverable, and that is how one presents`,
      );
    }
  }

  // -------------------------------------------------------------------------

  console.log(`spec ${SPEC_REF}: ${spec.size} codes    SDK: covered ${covered}/${spec.size}`);

  if (problems.length > 0) {
    console.error(`\nFAIL — ${problems.length} finding(s):\n`);
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      '\nThis gate never compares an action to its registry cell — §1.4 forbids asserting' +
        '\nbyte-identity, because translation and shortening are both permitted. Fix a' +
        '\nCOVERAGE finding by transcribing the cell; fix the others by keeping the tokens' +
        '\nand the addressing the cell carries. Rewording is allowed and always was.',
    );
    process.exit(1);
  }

  console.log(`OK — all ${spec.size} codes carry a distinct, bounded, structure-preserving recommendedAction`);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
