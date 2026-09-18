#!/usr/bin/env node
// Compare this repository's release tags against what the package registry
// actually holds, and fail when a tag never became a published version.
//
// WHY THIS EXISTS
// ---------------
// Publishing is a tag push. `publish.yml` builds, tests and runs `npm publish`
// on `v*`, and nothing downstream of it ever confirms the tarball arrived. When
// that workflow goes red the tag still exists, `main` still moves, every other
// gate stays green, and the only evidence is one red run in a history nobody
// re-reads.
//
// That is not hypothetical. `v0.38.1` was tagged 2026-09-14 and its publish
// died on an npm E404; the divergence was found on 2026-09-18 by a session
// looking at something else, after `v0.39.0` had failed the same way. For four
// days the newest tag and the newest published version disagreed and no signal
// existed that said so.
//
// The registry is the only writer that can answer "did this release happen".
// This script asks it, and is meant to run on a SCHEDULE rather than only on
// push: the failure being caught is a repository going quiet after a release,
// which is exactly when push-triggered gates stop running.
//
// TWO ASSERTIONS
// --------------
//   HEAD    the newest tag must exist on the registry. This is the one that
//           catches a release that failed silently.
//   SERIES  every other tag must be published as well, or be declared in
//           .release-gaps.json with a reason. An undeclared gap is a failure,
//           so a version that never shipped has to be recorded deliberately
//           instead of being discovered years later.
//
// The HEAD assertion holds its fire for --grace-minutes after the tag was
// created, because a scheduled run that fires while the publish job is still
// building would otherwise report a drift that resolves itself in thirty
// seconds. A check that cries wolf is how the next one gets ignored.
//
// REGISTRIES
// ----------
// `npm` reads registry.npmjs.org. `packagist` reads repo.packagist.org, which
// is how the PHP sibling ospp/protocol publishes — it has no publish workflow
// at all, only a Packagist webhook fired on tag push, so it carries the same
// exposure by a different mechanism and this same script covers it.
//
// Usage:
//   node scripts/check-release-drift.mjs
//   node scripts/check-release-drift.mjs --registry packagist --package ospp/protocol
//   node scripts/check-release-drift.mjs --versions-from f.json --tags-from t.txt --now 2026-09-18T12:00:00Z
//
// Exit: 0 no drift, 1 drift, 2 usage or I/O failure.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function usage(msg) {
  process.stderr.write(`ERROR: ${msg}\n\nUsage: node scripts/check-release-drift.mjs [options]\n` +
    `  --registry npm|packagist   registry to ask (default: npm)\n` +
    `  --package NAME             package name (default: name from package.json)\n` +
    `  --tags-from FILE           newline-separated tags instead of reading git\n` +
    `  --versions-from FILE       JSON array of versions instead of the registry\n` +
    `  --gaps-from FILE           declared gaps (default: .release-gaps.json)\n` +
    `  --grace-minutes N          suppress the HEAD failure for N minutes after the tag (default: 30)\n` +
    `  --now ISO8601              treat this as the current time (for testing the grace window)\n`);
  process.exit(2);
}

const argv = process.argv.slice(2);
const opt = { registry: 'npm', graceMinutes: 30 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => { if (i + 1 >= argv.length) usage(`${a} needs a value`); return argv[++i]; };
  if (a === '--registry') opt.registry = next();
  else if (a === '--package') opt.package = next();
  else if (a === '--tags-from') opt.tagsFrom = next();
  else if (a === '--versions-from') opt.versionsFrom = next();
  else if (a === '--gaps-from') opt.gapsFrom = next();
  else if (a === '--grace-minutes') opt.graceMinutes = Number(next());
  else if (a === '--now') opt.now = next();
  else usage(`unknown argument '${a}'`);
}
if (opt.registry !== 'npm' && opt.registry !== 'packagist') usage(`--registry must be npm or packagist, got '${opt.registry}'`);
if (!Number.isFinite(opt.graceMinutes) || opt.graceMinutes < 0) usage('--grace-minutes must be a non-negative number');

const now = opt.now ? new Date(opt.now) : new Date();
if (Number.isNaN(now.getTime())) usage(`--now '${opt.now}' is not a date`);

// ---------------------------------------------------------------- semver

// Release tags only. A prerelease is not a published release in this series and
// must not be able to satisfy or trip the HEAD assertion.
const RELEASE_RE = /^(\d+)\.(\d+)\.(\d+)$/;

function parse(v) {
  const m = RELEASE_RE.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function cmp(a, b) {
  const pa = parse(a), pb = parse(b);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

// ---------------------------------------------------------------- inputs

function readTags() {
  if (opt.tagsFrom) {
    const raw = readFileSync(opt.tagsFrom, 'utf8');
    const out = [];
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      const [ref, date] = t.split('|');
      const v = ref.replace(/^v/, '');
      if (parse(v)) out.push({ version: v, ref, date: date || null });
    }
    return out;
  }
  const raw = execFileSync('git', ['for-each-ref', '--format=%(refname:short)|%(creatordate:iso-strict)', 'refs/tags/'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const out = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const [ref, date] = t.split('|');
    if (!ref.startsWith('v')) continue;
    const v = ref.slice(1);
    if (parse(v)) out.push({ version: v, ref, date: date || null });
  }
  return out;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`);
  return res.json();
}

async function readPublished(pkg) {
  if (opt.versionsFrom) {
    const parsed = JSON.parse(readFileSync(opt.versionsFrom, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error(`${opt.versionsFrom} must hold a JSON array of versions`);
    return parsed.map(String);
  }
  if (opt.registry === 'npm') {
    const doc = await fetchJson(`https://registry.npmjs.org/${pkg.replace('/', '%2f')}`);
    return Object.keys(doc.versions || {});
  }
  const doc = await fetchJson(`https://repo.packagist.org/p2/${pkg}.json`);
  const entries = (doc.packages || {})[pkg] || [];
  return entries.map((e) => String(e.version).replace(/^v/, ''));
}

// An unreadable or malformed gaps file must stop the run, not silently read as
// "no gaps declared" — that would turn a broken file into a green SERIES.
// An explicitly empty file is the one way to say "declare nothing".
function readGaps() {
  const file = opt.gapsFrom || join(ROOT, '.release-gaps.json');
  if (!existsSync(file)) {
    if (opt.gapsFrom) {
      process.stderr.write(`ERROR: --gaps-from '${file}' does not exist.\n`);
      process.exit(2);
    }
    return {};
  }
  const raw = readFileSync(file, 'utf8');
  if (raw.trim() === '') return {};
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`ERROR: ${file} is not readable JSON: ${err.message}\n`);
    process.exit(2);
  }
  if (doc.gaps !== undefined && (typeof doc.gaps !== 'object' || doc.gaps === null || Array.isArray(doc.gaps))) {
    process.stderr.write(`ERROR: ${file} has a 'gaps' key that is not an object of version -> reason.\n`);
    process.exit(2);
  }
  return doc.gaps || {};
}

// ---------------------------------------------------------------- check

function defaultPackage() {
  if (opt.registry === 'packagist') usage('--package is required for --registry packagist');
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).name;
}

const pkg = opt.package || defaultPackage();
const tags = readTags();
const gaps = readGaps();

let published;
try {
  published = await readPublished(pkg);
} catch (err) {
  process.stderr.write(`ERROR: could not read published versions for '${pkg}' from ${opt.registry}: ${err.message}\n`);
  process.exit(2);
}

if (tags.length === 0) {
  process.stderr.write(`ERROR: no release tags matched vMAJOR.MINOR.PATCH in ${opt.tagsFrom || 'this repository'}. Refusing to report "no drift" over an empty set.\n`);
  process.exit(2);
}
if (published.length === 0) {
  process.stderr.write(`ERROR: ${opt.registry} reported zero versions for '${pkg}'. Refusing to report drift over an empty answer.\n`);
  process.exit(2);
}

const pubSet = new Set(published.filter((v) => parse(v)));
const sorted = [...tags].sort((a, b) => cmp(a.version, b.version));
const newest = sorted[sorted.length - 1];

const missing = sorted.filter((t) => !pubSet.has(t.version));
const undeclared = missing.filter((t) => !(t.version in gaps) && t.version !== newest.version);

process.stdout.write(`release drift — ${pkg} on ${opt.registry}\n`);
process.stdout.write(`  release tags     ${tags.length}\n`);
process.stdout.write(`  published        ${pubSet.size}\n`);
process.stdout.write(`  declared gaps    ${Object.keys(gaps).length}\n`);
process.stdout.write(`  newest tag       ${newest.ref}${newest.date ? ` (${newest.date})` : ''}\n`);
process.stdout.write(`  tags not published ${missing.length} of ${tags.length}: ${missing.map((t) => t.version).join(', ') || '(none)'}\n\n`);

const failures = [];

// HEAD
const headPublished = pubSet.has(newest.version);
let graceRemaining = 0;
if (!headPublished && newest.date) {
  const age = (now.getTime() - new Date(newest.date).getTime()) / 60000;
  if (Number.isFinite(age) && age < opt.graceMinutes) graceRemaining = opt.graceMinutes - age;
}
if (headPublished) {
  process.stdout.write(`  HEAD    OK — newest tag ${newest.ref} is published as ${newest.version}.\n`);
} else if (graceRemaining > 0) {
  process.stdout.write(`  HEAD    PENDING — ${newest.ref} is ${graceRemaining.toFixed(1)} min inside the ${opt.graceMinutes} min grace window; the publish job may still be running.\n`);
} else {
  failures.push(`newest tag ${newest.ref} is NOT published on ${opt.registry}. ` +
    `Newest published is ${[...pubSet].sort(cmp).pop()}. The publish for that tag failed or never ran.`);
  process.stdout.write(`  HEAD    FAIL — ${newest.ref} is not on ${opt.registry}.\n`);
}

// SERIES
if (undeclared.length === 0) {
  process.stdout.write(`  SERIES  OK — every tag below the newest is published or declared in .release-gaps.json.\n`);
} else {
  failures.push(`${undeclared.length} tag(s) never published and not declared as gaps: ${undeclared.map((t) => t.version).join(', ')}. ` +
    `Publish them, or record each one in .release-gaps.json with the reason it does not exist.`);
  process.stdout.write(`  SERIES  FAIL — undeclared gap(s): ${undeclared.map((t) => t.version).join(', ')}.\n`);
}

if (failures.length > 0) {
  process.stderr.write(`\nRELEASE DRIFT (${failures.length}):\n`);
  for (const f of failures) process.stderr.write(`  - ${f}\n`);
  process.stderr.write(`\nA tag is a publish request. When it does not arrive, the tag is the only thing that moved.\n`);
  process.exit(1);
}

process.stdout.write(`\nOK — ${pkg} on ${opt.registry} matches this repository's tags.\n`);
process.exit(0);
