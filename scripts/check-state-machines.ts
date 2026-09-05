/**
 * Derive every state machine from spec 05-state-machines.md and compare it to this SDK.
 *
 * WHY THIS EXISTS
 *
 * The six transition tables were the ONLY registries in this ecosystem with no gate
 * deriving them from the specification. The error registry, the config registry, the
 * action registry, the recommended actions, the schemas and the vector corpus each have
 * one; the state machines had a CONTRACT TEST that TRANSCRIBED the pairs by hand, under a
 * docblock quoting the section it was copying. A transcription is not a comparison.
 *
 * Two rows drifted through that gap, and both were found by reading rather than by a gate:
 *
 *   Bay `Unknown -> Reserved`     added at spec 0.30.0, refused by BOTH SDKs for three
 *                                 releases; the server delegates to them.
 *   Session `Active -> Completed` asserted in FOUR spec places for three autonomous stop
 *                                 reasons -- the physical Stop button among them -- and
 *                                 refused by both SDKs.
 *
 * A gate over one machine would have caught the first and missed the second. This covers
 * all six, and compares against the SPEC rather than the sibling SDK: two transcriptions
 * that are identically wrong pass a cross-SDK comparison and fail this one.
 *
 *   npm run check:state-machines
 *   SPEC_REPO=/local/path npm run check:state-machines
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EffectedBy } from '../src/enums/EffectedBy.js';
import * as Bay from '../src/state-machines/BayStateMachine.js';
import * as Station from '../src/state-machines/StationStateMachine.js';
import * as Session from '../src/state-machines/SessionStateMachine.js';
import * as Reservation from '../src/state-machines/ReservationStateMachine.js';
import * as Firmware from '../src/state-machines/FirmwareStateMachine.js';
import * as Diagnostics from '../src/state-machines/DiagnosticsStateMachine.js';

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

type Machine = {
  section: string;
  name: string;
  vocab: () => string[];
  can: (from: string, to: string, party?: 'Station' | 'Server') => boolean;
  party?: boolean;
};

const keysOf = (m: ReadonlyMap<string, ReadonlySet<string>>): string[] => {
  const s = new Set<string>();
  for (const [k, v] of m) { s.add(k); for (const t of v) s.add(t); }
  return [...s];
};

const MACHINES: Machine[] = [
  { section: '1.3', name: 'Station', vocab: () => keysOf(Station.STATION_TRANSITIONS as never),
    can: (f, t) => Station.canTransition(f as never, t as never) },
  { section: '2.3', name: 'Bay', party: true,
    vocab: () => keysOf(Bay.BAY_STATION_TRANSITIONS as never),
    can: (f, t, p) => Bay.canTransition(f as never, t as never, p === 'Station' ? EffectedBy.STATION : EffectedBy.SERVER) },
  { section: '3.3', name: 'Session', vocab: () => keysOf(Session.SESSION_TRANSITIONS as never),
    can: (f, t) => Session.canTransition(f as never, t as never) },
  { section: '4.3', name: 'Reservation', vocab: () => keysOf(Reservation.RESERVATION_TRANSITIONS as never),
    can: (f, t) => Reservation.canTransition(f as never, t as never) },
  { section: '6.3', name: 'Firmware', vocab: () => keysOf(Firmware.FIRMWARE_TRANSITIONS as never),
    can: (f, t) => Firmware.canTransition(f as never, t as never) },
  { section: '8.3', name: 'Diagnostics', vocab: () => keysOf(Diagnostics.DIAGNOSTICS_TRANSITIONS as never),
    can: (f, t) => Diagnostics.canTransition(f as never, t as never) },
];

// §5.3 BLE is named rather than silently skipped: this SDK has no BLE machine and the
// profile is EXPERIMENTAL. A gate that quietly covered six of seven tables would report a
// coverage it does not have.
const UNIMPLEMENTED = [{ section: '5.3', name: 'BLE Connection', why: 'no BLE state machine in this SDK; the profile is EXPERIMENTAL' }];

/** Every transition of one section as `From->To`, bounded to that section. */
function parseSection(lines: string[], section: string, party: boolean): [Record<string, Set<string>>, number] {
  const start = lines.findIndex((l) => l.startsWith(`### ${section} `));
  if (start < 0) {
    console.error(`ERROR: §${section} not found — the section matcher is broken, not the table`);
    process.exit(2);
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('### ') || lines[i].startsWith('## ')) { end = i; break; }
  }

  let fromIdx = -1, toIdx = -1, partyIdx = -1;
  const out: Record<string, Set<string>> = party ? { Station: new Set(), Server: new Set() } : { '*': new Set() };
  let rows = 0;

  for (let i = start; i < end; i++) {
    const l = lines[i];
    if (!l.startsWith('|') || /^\|[\s:|-]+\|$/.test(l)) continue;
    const cells = l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

    if (fromIdx < 0) {
      cells.forEach((c, k) => {
        if (/^from$/i.test(c)) fromIdx = k;
        if (/^to$/i.test(c)) toIdx = k;
        if (/^effected by$/i.test(c)) partyIdx = k;
      });
      continue;
    }
    if (cells[toIdx] === undefined || cells[fromIdx] === undefined) continue;

    const to = cells[toIdx].replace(/[`*]/g, '').trim();
    if (!/^[A-Z][A-Za-z]+$/.test(to)) continue;   // `--` initial rows are not state-to-state

    let bucket = '*';
    if (party) {
      const actor = cells[partyIdx] ?? '';
      if (actor.includes('Station')) bucket = 'Station';
      else if (actor.includes('Server')) bucket = 'Server';
      else continue;
    }
    for (const raw of cells[fromIdx].split(',')) {
      const from = raw.replace(/[`*]/g, '').trim();
      if (/^[A-Z][A-Za-z]+$/.test(from)) { out[bucket].add(`${from}->${to}`); rows++; }
    }
  }
  return [out, rows];
}

try {
  const md = readFileSync(join(specRoot, 'spec', '05-state-machines.md'), 'utf8').split('\n');
  const failures: string[] = [];
  const summary: string[] = [];

  for (const m of MACHINES) {
    const [spec, rows] = parseSection(md, m.section, m.party ?? false);
    if (rows === 0) {
      console.error(`ERROR: §${m.section} (${m.name}) parsed 0 transitions — the row matcher is broken, not the SDK`);
      process.exit(2);
    }

    // §2.3: "A station implements the Station rows. A server implements all of them."
    const expected: Record<string, Set<string>> = m.party
      ? { Station: spec.Station, Server: new Set([...spec.Station, ...spec.Server]) }
      : { '*': spec['*'] };

    // The vocabulary is the SDK's own states UNION the spec's, so a state the spec names
    // and this SDK does not carry is reported rather than silently dropped. TypeScript's
    // union types are erased at runtime, so the SDK side is read from the exported maps.
    const sdkVocab = m.vocab();
    const specVocab = new Set<string>();
    for (const set of Object.values(spec)) for (const k of set) { const [f, t] = k.split('->'); specVocab.add(f); specVocab.add(t); }
    const vocab = [...new Set([...sdkVocab, ...specVocab])];

    for (const [bucket, pairs] of Object.entries(expected)) {
      const sdk = new Set<string>();
      for (const f of vocab) for (const t of vocab) {
        if (m.can(f, t, bucket as 'Station' | 'Server')) sdk.add(`${f}->${t}`);
      }
      const label = `${m.name}${m.party ? ` (${bucket})` : ''}`;
      summary.push(`  ${label.padEnd(22)} spec ${String(pairs.size).padStart(2)} | SDK ${String(sdk.size).padStart(2)}`);

      for (const k of pairs) {
        const [f, t] = k.split('->');
        if (!sdkVocab.includes(f) || !sdkVocab.includes(t)) { failures.push(`${label}: ${k} names a state this SDK does not carry`); continue; }
        if (!sdk.has(k)) failures.push(`${label}: ${k} is in the spec and REFUSED by this SDK`);
      }
      for (const k of sdk) if (!pairs.has(k)) failures.push(`${label}: ${k} is allowed by this SDK and in NO spec row`);
    }
  }

  console.log('state machines, derived from 05-state-machines.md:');
  for (const s of summary) console.log(s);
  for (const u of UNIMPLEMENTED) console.log(`  ${u.name.padEnd(22)} §${u.section} NOT COVERED — ${u.why}`);
  console.log(`  machines compared: ${MACHINES.length} of ${MACHINES.length + UNIMPLEMENTED.length} tables in the chapter`);

  // SELF-CONTROL: rewrite every To cell of one section and require the parsed set to change.
  // A gate reporting on someone else's table must first prove it can see a change in one.
  // The first version of this control mutated ONE row and asserted its pair vanished; two
  // rows produce that pair, so it reported a blind parser when the control was the blind one.
  {
    const [before] = parseSection(md, '3.3', false);
    const mutated = [...md];
    let changed = 0, inSection = false;
    for (let i = 0; i < mutated.length; i++) {
      if (mutated[i].startsWith('### 3.3 ')) { inSection = true; continue; }
      if (inSection && (mutated[i].startsWith('### ') || mutated[i].startsWith('## '))) break;
      const mm = inSection ? /^\|([^|]*)\|([^|]*)\|([^|]*)\|/.exec(mutated[i]) : null;
      if (mm && /^[A-Z][A-Za-z]+$/.test(mm[3].replace(/[`*]/g, '').trim())) {
        mutated[i] = mutated[i].replace(/\|([^|]*)\|([^|]*)\|/, '|$1| ZzzSentinel |');
        changed++;
      }
    }
    if (changed === 0) { console.error('SELF-TEST: nothing to mutate in §3.3 — the control is blind. Fix the control.'); process.exit(3); }
    const [after] = parseSection(mutated, '3.3', false);
    const same = before['*'].size === after['*'].size && [...before['*']].every((k) => after['*'].has(k));
    if (same) { console.error(`SELF-TEST: ${changed} row(s) rewritten and the parsed set did NOT change — the parser is not reading the table it claims to.`); process.exit(3); }
    console.log(`  self-test: ${changed} rewritten row(s) changed the parsed set — the parser reads the table  OK`);
  }

  if (failures.length > 0) {
    console.error(`\nFAIL — ${failures.length} disagreement(s):`);
    for (const f of failures) console.error(`  ${f}`);
    console.error('\nFix the SDK to match the chapter. If the SPEC is what is wrong, fix it there and');
    console.error("re-pin .spec-ref — do not 'correct' the table here.");
    process.exit(1);
  }
  console.log('OK — every machine agrees with its section, in both directions');
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
