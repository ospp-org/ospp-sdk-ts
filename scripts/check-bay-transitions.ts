/**
 * Derive the bay transition table from spec 05-state-machines.md §2.3 and compare it
 * to BayStateMachine.
 *
 * WHY THIS EXISTS
 *
 * The canonical-table test in this repo TRANSCRIBES the pairs by hand. A transcription
 * is not a comparison. Spec 0.30.0 added `Unknown -> Reserved` — a station that reboots
 * holding a `Confirmed` reservation reports `Reserved`, and §2.3 made persisting that
 * reservation a station-side MUST "for exactly this reason". The row reached the
 * canonical table and NOTHING else: this SDK refused the transition, ospp-sdk-php
 * refused it, and the reference server delegates to them — so the one truthful
 * post-boot report was rejected in all three, and a station following the guides
 * reported `Available`, which resells a reserved bay.
 *
 * The six state machines were the only registries in this ecosystem with no parity
 * gate. The error registry, config registry, action registry, recommended actions,
 * schemas and vectors all have one. This closes the bay half.
 *
 *   npm run check:bay-transitions
 *   SPEC_REPO=/local/path npm run check:bay-transitions
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BayStatus } from '../src/enums/BayStatus.js';
import { EffectedBy } from '../src/enums/EffectedBy.js';
import { canTransition } from '../src/state-machines/BayStateMachine.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_REF = readFileSync(join(ROOT, '.spec-ref'), 'utf8').trim();

if (!/^v\d+\.\d+\.\d+(-[a-zA-Z0-9._-]+)?$/.test(SPEC_REF)) {
  console.error(`ERROR: .spec-ref value '${SPEC_REF}' does not match SemVer tag pattern`);
  process.exit(1);
}

let specRoot = process.env.SPEC_REPO;
let tmp: string | undefined;
if (specRoot) {
  console.log(`Comparing against local spec checkout at ${specRoot} (.spec-ref=${SPEC_REF} — not enforced for local mode)`);
} else {
  tmp = mkdtempSync(join(tmpdir(), 'ospp-spec-'));
  specRoot = join(tmp, 'spec');
  console.log(`Cloning ospp-org/spec at ${SPEC_REF}...`);
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', SPEC_REF, 'https://github.com/ospp-org/spec.git', specRoot], { stdio: 'inherit' });
}

const STATES = ['Unknown', 'Available', 'Reserved', 'Occupied', 'Finishing', 'Faulted', 'Unavailable'];

try {
  const md = readFileSync(join(specRoot, 'spec', '05-state-machines.md'), 'utf8').split('\n');

  // Bounded to §2.3: the file holds six transition tables and a global scan merges them.
  const start = md.findIndex((l) => l.startsWith('### 2.3'));
  if (start < 0) {
    console.error('ERROR: §2.3 not found — the section matcher is broken, not the table');
    process.exit(2);
  }
  let end = md.length;
  for (let i = start + 1; i < md.length; i++) {
    if (md[i].startsWith('### ') || md[i].startsWith('## ')) { end = i; break; }
  }

  const spec: Record<string, Set<string>> = { Station: new Set(), Server: new Set() };
  for (let i = start; i < end; i++) {
    const l = md[i];
    if (!l.startsWith('|') || /^\|[\s:|-]+\|$/.test(l)) continue;
    const cells = l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 5 || cells[0].toLowerCase().startsWith('trigger')) continue;
    const actor = cells[3].includes('Station') ? 'Station' : cells[3].includes('Server') ? 'Server' : null;
    if (!actor) continue;
    const to = cells[2].replace(/[`*]/g, '').trim();
    if (!STATES.includes(to)) continue;
    for (const raw of cells[1].split(',')) {
      const from = raw.replace(/[`*]/g, '').trim();
      if (STATES.includes(from)) spec[actor].add(`${from}->${to}`);
    }
  }

  if (spec.Station.size === 0 || spec.Server.size === 0) {
    console.error('ERROR: parsed 0 rows for one of the parties — the row matcher is broken, not the SDK');
    process.exit(2);
  }

  // §2.3: "A station implements the `Station` rows. A server implements all of them."
  // So the SERVER party is the UNION; comparing it to the six Server-effected rows alone
  // reports every Station row as an extra.
  const expected: Record<string, Set<string>> = {
    Station: spec.Station,
    Server: new Set([...spec.Station, ...spec.Server]),
  };

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const sdk: Record<string, Set<string>> = { Station: new Set(), Server: new Set() };
  for (const [label, party] of [['Station', EffectedBy.STATION], ['Server', EffectedBy.SERVER]] as const) {
    for (const from of Object.values(BayStatus)) {
      for (const to of Object.values(BayStatus)) {
        if (canTransition(from, to, party)) sdk[label].add(`${cap(from)}->${cap(to)}`);
      }
    }
  }

  const failures: string[] = [];
  for (const party of ['Station', 'Server']) {
    for (const k of expected[party]) if (!sdk[party].has(k)) failures.push(`${party}: ${k} is in the spec and REFUSED by this SDK`);
    for (const k of sdk[party]) if (!expected[party].has(k)) failures.push(`${party}: ${k} is allowed by this SDK and in NO spec row`);
  }

  console.log(
    `bay transitions, derived from 05-state-machines.md §2.3: spec Station=${expected.Station.size} Server=${expected.Server.size} | SDK Station=${sdk.Station.size} Server=${sdk.Server.size}`,
  );

  if (failures.length > 0) {
    console.error(`\nFAIL — ${failures.length} disagreement(s):`);
    for (const f of failures) console.error(`  ${f}`);
    console.error('\nFix the SDK to match §2.3. If the SPEC is what is wrong, fix it there and');
    console.error("re-pin .spec-ref — do not 'correct' the table here.");
    process.exit(1);
  }
  console.log('OK — the bay table and this SDK agree on every transition, both directions');
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
