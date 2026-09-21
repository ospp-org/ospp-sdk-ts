/**
 * Gate: a quotation this repository attributes to the spec must be IN the spec.
 *
 * WHY THIS EXISTS
 * ---------------
 * Comments in this repository argue from the specification constantly, and they
 * argue by quoting it. A quotation is the strongest form a comment can take --
 * it reads as evidence rather than as opinion -- and it is also the only form
 * that can rot invisibly. An out-of-date PARAPHRASE still reads as a summary. An
 * out-of-date QUOTATION reads as the spec's own words, in quotation marks, with
 * a section number next to it, long after the spec stopped saying them.
 *
 * Nothing in either SDK could tell the difference. The registry gates compare
 * tables, the schema gates compare vendored JSON, and the doc-claims gate checks
 * claims written in a claim table. Free prose in a `/** ... *\u002f` block, which
 * is where the reasoning actually lives, was unread by every one of them.
 *
 * WHAT IS PARSED RATHER THAN MATCHED
 * ----------------------------------
 * 1. COMMENTS. A source scanner tracks string, template and heredoc literals, so
 *    a double quote inside code never opens a quotation. Only comments are
 *    searched (and, for Markdown, prose outside fenced code).
 *
 * 2. LOGICAL BLOCKS. A block comment is rejoined with its leading continuation
 *    markers removed; a run of line comments is joined the same way. A quotation
 *    that wraps across comment lines is ONE quotation. Matching line by line is
 *    what produced the previous probe's 53 not-founds.
 *
 * 3. CITABLE DOCUMENT NAMES are derived from the spec tree itself, not guessed:
 *    every Markdown basename under the pinned checkout. A name the spec does not
 *    carry is not a citation.
 *
 * 4. ATTRIBUTION IS A BINDING, NOT CO-OCCURRENCE. A quotation counts as
 *    spec-attributed only when a citation token stands within GAP characters of
 *    the quotation's edge, with no other quotation and no sentence boundary
 *    between them. Citations are searched with every quotation MASKED, so a
 *    phrase ending in the word spec cannot cite itself.
 *
 *    That binding is what separates
 *
 *        (Section 5.1): "A rule requiring per-message judgement ..."      cited
 *        ... row reads "This mode exists for development ..."             cited
 *        ... turn off" (Section 5.6).                                     cited
 *
 *    from
 *
 *        reported "recoverable: identical, 0 diffs" while both were wrong  not
 *        proves "everything we vendored matches the spec"                  not
 *
 *    both of which sit in blocks that mention the spec elsewhere.
 *
 * 5. CONFORMANCE STEP NUMBERS ARE NOT SECTIONS. A conformance step is written
 *    with the section sign in these repositories exactly as a spec section is,
 *    and a step number is not a section number. A section sign carrying a
 *    conformance-case prefix is not a citation.
 *
 * WHAT IS DELIBERATELY NOT A CITATION
 * -----------------------------------
 * The words spec, specification and verbatim are NOT citations. Measured on this
 * repository, they were the whole binding for three quotations that turned out
 * to be this repository quoting its OWN console output and its own comments: a
 * workflow quoting itself, a crypto-vector script quoting its own OK line, and a
 * state-machine gate quoting a comment it had disowned. A section sign, or a
 * document name the corpus actually carries, is the only marker strong enough to
 * hold a verdict -- and every true positive already has one.
 *
 * EXIT CODES
 *   0  every spec-attributed quotation is in the spec
 *   1  at least one is not
 *   2  the scan examined too little to return a verdict, or the built-in
 *      control did not fire
 *
 * Usage:
 *   npm run check:spec-quotations                        # clones the pinned ref
 *   SPEC_REPO=/local/path npm run check:spec-quotations  # uses a local checkout
 *   npm run check:spec-quotations -- --json              # full record dump
 *
 * GAP, MINWORDS and EXCLUDE are readable from the environment for investigation.
 * CI passes none of them, so CI always runs the defaults printed in the header.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const GAP = Number(process.env.GAP ?? '60'); // chars allowed between citation and quote
const MINWORDS = Number(process.env.MINWORDS ?? '4'); // a value like Rejected is not a quotation

const BACKTICK = '\u0060';
const LDQUO = '\u201c';
const RDQUO = '\u201d';

// ── comment scanning ────────────────────────────────────────────────────────

type CommentKind = 'block' | 'line';
interface RawComment {
  kind: CommentKind;
  off: number;
  text: string;
}
interface Block {
  off: number;
  body: string;
}

// Sticky, so the heredoc opener is tested at a position without copying the tail.
const HEREDOC_OPEN = new RegExp('<<<\\s*[\'"]?([A-Za-z_]\\w*)[\'"]?\\r?\\n', 'y');

function scanCLike(src: string, php = false): RawComment[] {
  const out: RawComment[] = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2);
      j = j < 0 ? n : j + 2;
      out.push({ kind: 'block', off: i, text: src.slice(i, j) });
      i = j;
    } else if (c === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i);
      if (j < 0) j = n;
      out.push({ kind: 'line', off: i, text: src.slice(i, j) });
      i = j;
    } else if (php && c === '#' && !src.startsWith('#[', i)) {
      let j = src.indexOf('\n', i);
      if (j < 0) j = n;
      out.push({ kind: 'line', off: i, text: src.slice(i, j) });
      i = j;
    } else if (c === "'" || c === '"' || c === BACKTICK) {
      const q = c;
      i += 1;
      while (i < n) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === q) {
          i += 1;
          break;
        }
        i += 1;
      }
    } else if (php && src.startsWith('<<<', i)) {
      HEREDOC_OPEN.lastIndex = i;
      const m = HEREDOC_OPEN.exec(src);
      if (m) {
        const after = i + m[0].length;
        const end = new RegExp('^\\s*' + m[1] + '\\b', 'gm');
        end.lastIndex = after;
        const e = end.exec(src);
        i = e ? e.index + e[0].length : after;
      } else {
        i += 3;
      }
    } else {
      i += 1;
    }
  }
  return out;
}

function scanHash(src: string): RawComment[] {
  const out: RawComment[] = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '#') {
      let j = src.indexOf('\n', i);
      if (j < 0) j = n;
      out.push({ kind: 'line', off: i, text: src.slice(i, j) });
      i = j;
    } else if (c === "'" || c === '"') {
      const q = c;
      i += 1;
      while (i < n) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === q) {
          i += 1;
          break;
        }
        if (src[i] === '\n') break;
        i += 1;
      }
    } else {
      i += 1;
    }
  }
  return out;
}

function countNewlines(s: string): number {
  let k = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === '\n') k++;
  return k;
}

const CONT_MARKER = /^[ \t]*\*+ ?/gm;
const LINE_MARKER = new RegExp('^[ \\t]*(//+|#)[ \\t]?');

/**
 * A block comment is one block; a RUN of adjacent line comments is one block.
 *
 * A run ends at the first line comment separated from the previous one by a
 * blank line or by any code. Without this, a quotation wrapped across two
 * comment lines is two half-quotations, and neither half is in the spec.
 */
function commentBlocks(src: string, comments: RawComment[]): Block[] {
  const out: Block[] = [];
  let i = 0;
  let prevEnd = 0;
  while (i < comments.length) {
    const head = comments[i];
    if (head.kind === 'block') {
      let body = head.text.endsWith('*/') ? head.text.slice(2, -2) : head.text.slice(2);
      body = body.replace(CONT_MARKER, '');
      out.push({ off: head.off, body });
      i += 1;
    } else {
      const start = head.off;
      const parts: string[] = [];
      while (i < comments.length && comments[i].kind === 'line') {
        if (parts.length > 0) {
          const gap = src.slice(prevEnd, comments[i].off);
          if (countNewlines(gap) > 1 || gap.trim() !== '') break;
        }
        const t = comments[i].text;
        parts.push(t.replace(LINE_MARKER, ''));
        prevEnd = comments[i].off + t.length;
        i += 1;
      }
      out.push({ off: start, body: parts.join('\n') });
    }
  }
  return out;
}

const FENCE = new RegExp('^' + BACKTICK.repeat(3) + '[\\s\\S]*?^' + BACKTICK.repeat(3), 'gm');
const PARA_SEP = /(\n[ \t]*\n)/;

/** Markdown prose outside fenced code, one paragraph per block. */
function markdownBlocks(src: string): Block[] {
  const stripped = src.replace(FENCE, (m) => '\n'.repeat(countNewlines(m)));
  const out: Block[] = [];
  let off = 0;
  for (const para of stripped.split(PARA_SEP)) {
    if (para.startsWith('\n')) {
      off += para.length;
      continue;
    }
    out.push({ off, body: para });
    off += para.length;
  }
  return out;
}

// ── quotations ──────────────────────────────────────────────────────────────

// A quotation may wrap across comment lines but not across a blank line.
const QUOTE = new RegExp(
  '"((?:[^"\\n]|\\n(?![ \\t]*\\n))*?)"' + '|' + LDQUO + '((?:[^' + RDQUO + '\\n]|\\n(?![ \\t]*\\n))*?)' + RDQUO,
  'g',
);

const ELISION = new RegExp('\\[\\s*(?:\\.\\.\\.|\u2026)\\s*\\]|\\.\\.\\.|\u2026', 'g');
const SENTENCE_END = new RegExp('[.!?]["\')\\]]*\\s');

const EMPHASIS = new RegExp('\\*\\*(?=\\S)|(?<=\\S)\\*\\*|(?<![\\w*])\\*(?=\\S)|(?<=\\S)\\*(?![\\w*])', 'g');
const MD_LINK = /\[([^\]]+)\]\([^)]*\)/g;
const BLOCKQUOTE = /^[ \t]*>[ \t]?/gm;
const MD_ESCAPE = new RegExp('\\\\([<>\\[\\]()*_' + BACKTICK + '#|-])', 'g');
const QUOTEY = new RegExp('[\u2018\u2019' + LDQUO + RDQUO + '"]', 'g');
const DASHY = /[\u2014\u2013\u2212]/g;

/**
 * Typography is levelled; words are not.
 *
 * Every rule here was isolated as the decisive cause of a miss on a quotation
 * that IS in the spec, by checking the span with and without it:
 *
 *   blockquote markers   a sentence wrapped inside a blockquote carries its
 *                        marker on the continuation line, so collapsing
 *                        whitespace alone yields a stray marker mid-sentence.
 *   markdown links       the spec writes a section reference as a link; prose
 *                        quoting it writes the label only.
 *   backticks            a code identifier quoted bare is the same words.
 *   double hyphen        an ASCII double hyphen standing in for an em dash.
 *   apostrophes, quotes  a span living inside a double-quoted comment must
 *                        downgrade the spec's double quotes to single ones.
 *   arrows               ASCII arrows for the Unicode ones.
 *   backslash escapes    the spec escapes angle brackets inside table cells.
 *   emphasis             a sentence quoted out of a table into running prose
 *                        legitimately drops its emphasis markers.
 *
 * Words, numbers, and every other character are untouched, so an altered or
 * invented quotation is still reported. Case is NOT folded here -- MUST and
 * must are different claims; only a fragment's first character is treated
 * leniently, and that is done in the matcher, not here.
 */
function normalise(s: string): string {
  let t = s.normalize('NFKC');
  t = t.replace(BLOCKQUOTE, '');
  t = t.replace(MD_LINK, '$1');
  t = t
    .replace(QUOTEY, "'")
    .replace(DASHY, '-')
    .replace(/--/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u00a0/g, ' ')
    .split(BACKTICK)
    .join('');
  t = t.replace(MD_ESCAPE, '$1');
  t = t.replace(EMPHASIS, '');
  return t.replace(/\s+/g, ' ').trim();
}

const TRIM_SET = ' -,;:.|';

function trimEdges(s: string): string {
  let a = 0;
  let b = s.length;
  while (a < b && TRIM_SET.includes(s[a])) a++;
  while (b > a && TRIM_SET.includes(s[b - 1])) b--;
  return s.slice(a, b);
}

/**
 * An elided quotation is fragments that must appear in order.
 *
 * Edge punctuation is trimmed from each fragment: a table row quoted as a
 * sentence ends in a full stop where the spec's own cell ends in a pipe, and
 * that is punctuation, not a different claim.
 */
function fragments(q: string): string[] {
  return q
    .split(ELISION)
    .map((p) => trimEdges(p))
    .filter((f) => f !== '');
}

/**
 * Find a fragment, forgiving ONLY its first character's case.
 *
 * A quotation spliced after a colon lowercases the sentence-initial capital:
 * where the spec opens a sentence with There, the comment that splices it after
 * a colon opens with there. That is the splice, not a different claim. Nothing
 * else is case-folded -- MUST and must stay different words.
 */
function findLenient(text: string, frag: string, start: number): number {
  const k = text.indexOf(frag, start);
  if (k >= 0 || frag === '') return k;
  const head = frag[0];
  const lower = head.toLowerCase();
  const upper = head.toUpperCase();
  const other = lower === head && upper !== head ? upper : lower;
  if (other === head) return -1;
  return text.indexOf(other + frag.slice(1), start);
}

const NORMATIVE = 'spec/';

/** Cited document first, then the normative chapters, then everything else. */
function corpusOrder(texts: Map<string, string>, cite: string): [string, string][] {
  const needle = cite.toLowerCase();
  const named: [string, string][] = [];
  const spec: [string, string][] = [];
  const other: [string, string][] = [];
  for (const [n, t] of texts) {
    if (needle !== '' && ('/' + n.toLowerCase()).includes(needle)) named.push([n, t]);
    else if (n.startsWith(NORMATIVE)) spec.push([n, t]);
    else other.push([n, t]);
  }
  return [...named, ...spec, ...other];
}

/** cited | normative | elsewhere -- elsewhere means the SECTION does not carry it. */
function sourceClass(where: string | null, cite: string): string | null {
  if (where === null) return null;
  if (cite !== '' && ('/' + where.toLowerCase()).includes(cite.toLowerCase())) return 'cited';
  return where.startsWith(NORMATIVE) ? 'normative' : 'elsewhere';
}

// ── the examination ─────────────────────────────────────────────────────────

interface Record {
  file: string;
  line: number;
  quote: string;
  cite: string;
  where: string | null;
  order: string | null;
  source: string | null;
}

interface BlockResult {
  quotes: number;
  attributed: number;
  found: Record[];
  missing: Record[];
}

interface Corpus {
  texts: Map<string, string>;
  citation: RegExp;
  tcStep: RegExp;
}

/**
 * One block of prose, examined end to end.
 *
 * This is the whole judgement: quotations, masking, the citation binding, the
 * normalisation and the corpus search. The built-in control calls exactly this
 * function, so a control that fires is evidence about the real path.
 */
function examineBlock(corpus: Corpus, body: string, file: string, lineBase: number): BlockResult {
  const res: BlockResult = { quotes: 0, attributed: 0, found: [], missing: [] };
  QUOTE.lastIndex = 0;
  const qs = [...body.matchAll(QUOTE)];
  if (qs.length === 0) return res;
  res.quotes = qs.length;

  // citations are searched with every quotation masked, so a quotation can
  // never cite itself
  const chars = body.split('');
  for (const m of qs) {
    for (let k = m.index; k < m.index + m[0].length; k++) chars[k] = '\0';
  }
  const masked = chars.join('');

  corpus.citation.lastIndex = 0;
  const cites = [...masked.matchAll(corpus.citation)].filter(
    (c) => !corpus.tcStep.test(masked.slice(Math.max(0, c.index - 40), c.index)),
  );
  if (cites.length === 0) return res;

  for (const m of qs) {
    const raw = m[1] !== undefined ? m[1] : m[2];
    const q = normalise(raw);
    if (q.split(' ').filter((w) => w !== '').length < MINWORDS) continue;

    let bound: string | null = null;
    for (const c of cites) {
      const cEnd = c.index + c[0].length;
      const mEnd = m.index + m[0].length;
      let gap: string;
      if (cEnd <= m.index) gap = masked.slice(cEnd, m.index);
      else if (c.index >= mEnd) gap = masked.slice(mEnd, c.index);
      else continue;
      if (gap.length > GAP || gap.includes('\0') || SENTENCE_END.test(gap)) continue;
      bound = c[0].trim();
      break;
    }
    if (bound === null) continue;
    res.attributed += 1;

    const line = lineBase + countNewlines(body.slice(0, m.index));
    const frs = fragments(q).map((f) => normalise(f));
    let where: string | null = null;
    let order: string | null = null;

    // SEARCH ORDER MATTERS FOR THE ANSWER, not for the verdict. A plain sort put
    // the changelog first, so a sentence present in BOTH a chapter and the
    // changelog was reported as living in the changelog -- which made 24 of 146
    // accepted quotations look as though only a release note carried them. The
    // cited document is tried first, then the normative chapters, then the rest,
    // and the class is recorded. A quotation satisfied ONLY by the third class is
    // attributed to a section that does not contain it, even though the words
    // exist somewhere in the repository.
    const ordered = corpusOrder(corpus.texts, bound);
    for (const [name, text] of ordered) {
      // IN ORDER first -- an elision means and then, later.
      let pos = 0;
      let good = true;
      for (const f of frs) {
        const k = findLenient(text, f, pos);
        if (k < 0) {
          good = false;
          break;
        }
        pos = k + f.length;
      }
      if (good) {
        where = name;
        order = 'in order';
        break;
      }
    }
    if (where === null) {
      // A quotation may legitimately join two passages the chapter states in the
      // OPPOSITE order: one canonical-table test puts a counts paragraph first
      // and a preamble sentence second, and the chapter carries them the other
      // way round. Both halves are verbatim; only the reading order differs.
      // That is a hit, recorded as one found out of order rather than counted
      // silently.
      for (const [name, text] of ordered) {
        if (frs.every((f) => findLenient(text, f, 0) >= 0)) {
          where = name;
          order = 'out of order';
          break;
        }
      }
    }
    const rec: Record = {
      file,
      line,
      quote: q,
      cite: bound,
      where,
      order,
      source: sourceClass(where, bound),
    };
    if (where !== null) res.found.push(rec);
    else res.missing.push(rec);
  }
  return res;
}

// ── corpus and repository ───────────────────────────────────────────────────

/** The same character set the reference escapes, so the alternation is identical. */
function escapeRe(s: string): string {
  return s.replace(/[()[\]{}?*+\-|^$\\.&~#\s]/g, '\\$&');
}

function walkMarkdown(root: string, rel: string, acc: string[]): void {
  for (const ent of readdirSync(join(root, rel), { withFileTypes: true })) {
    const child = rel === '' ? ent.name : rel + '/' + ent.name;
    if (ent.isDirectory()) walkMarkdown(root, child, acc);
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) acc.push(child);
  }
}

/** utf-8 only, and a file that is not utf-8 is skipped rather than mangled. */
const DECODER = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function readUtf8(path: string): string | null {
  try {
    return DECODER.decode(readFileSync(path));
  } catch {
    return null;
  }
}

// ── spec checkout, exactly as the other gates resolve it ────────────────────

const SPEC_REF = readFileSync(join(ROOT, '.spec-ref'), 'utf8').trim();

// .spec-ref is PR-mutable and is passed to `git clone --branch`. execFileSync
// takes an argv array, so there is no shell to inject into -- but a value
// beginning with a dash would still be read by git as an OPTION rather than a
// ref. Validate against the same SemVer-tag allowlist the other gates use,
// before the value reaches any argv.
if (!/^v\d+\.\d+\.\d+(-[a-zA-Z0-9._-]+)?$/.test(SPEC_REF)) {
  console.error(
    `ERROR: .spec-ref value '${SPEC_REF}' does not match SemVer tag pattern (v<MAJOR>.<MINOR>.<PATCH>[-prerelease])`,
  );
  process.exit(1);
}

const asJson = process.argv.slice(2).includes('--json');

let specRoot = process.env.SPEC_REPO;
let tmp: string | undefined;
let refLabel = SPEC_REF;
if (specRoot) {
  refLabel = 'local checkout';
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
  const mdPaths: string[] = [];
  walkMarkdown(specRoot, '', mdPaths);
  mdPaths.sort();

  // A corpus that parsed to a handful of documents is not the spec, and every
  // quotation in the repository would then be "not found" — a wall of false
  // findings that reads exactly like a real regression. v0.42.0 carries 121.
  if (mdPaths.length < 50) {
    console.error(
      `ERROR: the spec checkout at ${specRoot} yielded only ${mdPaths.length} Markdown document(s).\n` +
        'That is not the specification corpus. Refusing a verdict rather than reporting every\n' +
        'quotation in this repository as missing.',
    );
    process.exit(2);
  }

  const texts = new Map<string, string>();
  for (const rel of mdPaths) {
    const raw = readUtf8(join(specRoot, rel));
    if (raw === null) continue;
    texts.set(rel, normalise(raw));
  }

  // citable document names, derived from the corpus
  const docs = [...new Set(mdPaths.map((p) => p.slice(p.lastIndexOf('/') + 1)))].sort();
  const citation = new RegExp(
    '(?<!TC-)\u00a7\\s*\\d+(?:\\.\\d+)*' + '|\\b(?:' + docs.map(escapeRe).join('|') + ')\\b',
    'gi',
  );
  // A section sign carrying a conformance-case prefix is a step number.
  // The optional newline before the anchor mirrors the reference's `$`, which
  // also matches just before a trailing newline.
  const tcStep = new RegExp('TC-[A-Z]+-\\d+[^.\\n]{0,20}\\n?$');
  const corpus: Corpus = { texts, citation, tcStep };

  // ── positive control ──────────────────────────────────────────────────────
  //
  // A finder that finds nothing proves nothing. Before the repository is
  // touched, the same examination runs over two synthetic blocks built from the
  // corpus itself: one quoting a passage verbatim, one quoting the same passage
  // with an alien word appended. The gate refuses a verdict unless the first is
  // accepted and the second is reported. It is derived from the corpus rather
  // than written down here, so it cannot go stale against a spec release.
  const controlDoc = mdPaths.find((p) => p.startsWith(NORMATIVE)) ?? mdPaths[0];
  const controlWords = (texts.get(controlDoc) ?? '').split(' ');
  let sentence = '';
  for (let w = 40; w + 12 <= controlWords.length && w < 540; w++) {
    const cand = controlWords.slice(w, w + 12).join(' ');
    if (/[|\0]/.test(cand) || cand.includes('...') || cand.includes('\u2026')) continue;
    sentence = cand;
    break;
  }
  if (sentence === '') {
    console.error(`ERROR: no control passage could be taken from ${controlDoc}. Refusing a verdict.`);
    process.exit(2);
  }
  const genuine = examineBlock(corpus, '\u00a7 1.1: "' + sentence + '"', '<control>', 1);
  const planted = examineBlock(corpus, '\u00a7 1.1: "' + sentence + ' zzqxvvz"', '<control>', 1);
  if (genuine.attributed !== 1 || genuine.found.length !== 1) {
    console.error(
      'ERROR: positive control FAILED — a passage taken verbatim from ' +
        `${controlDoc} was not accepted (attributed=${genuine.attributed}, found=${genuine.found.length}).\n` +
        'The scanner, the citation binding or the normaliser is broken. Refusing a verdict.',
    );
    process.exit(2);
  }
  if (planted.attributed !== 1 || planted.missing.length !== 1) {
    console.error(
      'ERROR: positive control FAILED — the same passage with an alien word appended was NOT ' +
        `reported (attributed=${planted.attributed}, missing=${planted.missing.length}).\n` +
        'This gate cannot fail, so it cannot pass. Refusing a verdict.',
    );
    process.exit(2);
  }
  console.log(`positive control: a fabricated variant of a passage in ${controlDoc} was caught — OK`);

  const exclude = new RegExp(
    '^(?:' +
      (process.env.EXCLUDE ??
        '^(dist|node_modules|vendor|src/schemas|src/test-vectors|schemas|' +
          'tests/Fixtures/test-vectors|tests/crypto/fixtures|' +
          'tests/Contract/Crypto/fixtures)/|(^|/)CHANGELOG\\.md$') +
      ')',
  );

  const tracked = execFileSync('git', ['-C', ROOT, 'ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((f) => f !== '');
  const files = tracked.filter((f) => !exclude.test(f));

  const found: Record[] = [];
  const missing: Record[] = [];
  const stats = { files: files.length, blocks: 0, quotes: 0, attributed: 0, verbatim: 0, notfound: 0 };

  for (const rel of files) {
    const src = readUtf8(join(ROOT, rel));
    if (src === null) continue;
    const dot = rel.lastIndexOf('.');
    const ext = dot < 0 ? '' : rel.slice(dot).toLowerCase();
    let bs: Block[];
    if (ext === '.ts' || ext === '.mjs' || ext === '.js' || ext === '.tsx') bs = commentBlocks(src, scanCLike(src));
    else if (ext === '.php') bs = commentBlocks(src, scanCLike(src, true));
    else if (ext === '.yml' || ext === '.yaml' || ext === '.sh' || ext === '.bash') bs = commentBlocks(src, scanHash(src));
    else if (ext === '.md') bs = markdownBlocks(src);
    else continue;

    for (const { off, body } of bs) {
      stats.blocks += 1;
      const r = examineBlock(corpus, body, rel, countNewlines(src.slice(0, off)) + 1);
      stats.quotes += r.quotes;
      stats.attributed += r.attributed;
      found.push(...r.found);
      missing.push(...r.missing);
    }
  }

  stats.verbatim = found.length;
  stats.notfound = missing.length;

  if (asJson) {
    console.log(
      JSON.stringify({ repo: ROOT, spec: specRoot, gap: GAP, minwords: MINWORDS, stats, found, missing }, null, 1),
    );
  }

  const byClass = { cited: 0, normative: 0, elsewhere: 0 };
  for (const f of found) {
    if (f.source === 'cited') byClass.cited += 1;
    else if (f.source === 'normative') byClass.normative += 1;
    else byClass.elsewhere += 1;
  }

  console.log(`spec ${refLabel}: ${mdPaths.length} documents, ${docs.length} citable names`);
  console.log(`  tracked files scanned   ${stats.files}`);
  console.log(`  comment blocks          ${stats.blocks}`);
  console.log(`  quotations              ${stats.quotes}`);
  console.log(`  spec-attributed         ${stats.attributed}   (gap ${GAP}, minwords ${MINWORDS})`);
  console.log(`    in the cited document ${byClass.cited}`);
  console.log(`    in another chapter    ${byClass.normative}`);
  console.log(`    outside spec/ only    ${byClass.elsewhere}`);
  console.log(`  found verbatim          ${stats.verbatim}`);
  console.log(`  NOT FOUND               ${stats.notfound}`);
  console.log('');

  // ── non-vacuity ───────────────────────────────────────────────────────────
  //
  // The verdict's denominator is the number of ATTRIBUTED quotations, not the
  // number of files: a scanner that stops recognising comments, a citation regex
  // that stops matching, or a masking bug that swallows every binding all leave
  // this gate reporting a clean pass over nothing at all. Measured at spec
  // v0.42.0: 68 attributed here, 78 in the PHP SDK. The floor is 40, roughly
  // 60% of the smaller of the two, which leaves room for comments to be deleted
  // in the ordinary course of work while still catching a collapse. Raise it
  // deliberately if the corpus grows; do not lower it to make a red gate green.
  if (stats.attributed < 40) {
    console.error(
      `ERROR: only ${stats.attributed} spec-attributed quotation(s) were found in ${stats.files} tracked file(s).\n` +
        'The comment scanner or the citation binding has probably stopped working. Refusing to\n' +
        'report a pass over a denominator this small; fix the parser in scripts/check-spec-quotations.ts.',
    );
    process.exit(2);
  }

  if (missing.length > 0) {
    console.error(`${missing.length} spec-attributed quotation(s) are NOT in spec ${refLabel}:\n`);
    for (const r of missing) {
      console.error(`  ${r.file}:${r.line}`);
      console.error(`    cited as  ${r.cite}`);
      console.error(`    quoted    ${r.quote}`);
      console.error('');
    }
    console.error(
      'A quotation in quotation marks next to a section number reads as the spec\'s own words.\n' +
        'Either fix the text to what the spec says at this ref, or stop presenting it as a\n' +
        'quotation. If the SPEC is what changed, re-pin .spec-ref and update the comment with it.',
    );
    process.exit(1);
  }

  console.log(`OK — all ${stats.attributed} spec-attributed quotation(s) are in spec ${refLabel}`);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
