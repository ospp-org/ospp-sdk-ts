/**
 * Gate: the SDK configuration registry vs the SPEC configuration registry.
 *
 * Compares every entry of CONFIG_KEY_REGISTRY against the key tables in the spec's
 * `spec/08-configuration.md`, on the five properties the spec declares per key —
 * `Type`, `Default`, `Access`, `Mutability` from §§2--6, and the **Profile ID** from
 * §1.5 — plus the key set itself, in both directions.
 *
 * `Range` and `Description` are deliberately NOT checked. `ConfigKeyMeta` models
 * neither, so neither has anything here to compare to and neither is claimed.
 *
 * ---
 *
 * **Why this gate exists.** This is the port the 0.15.0 release notes said was
 * worth doing and did not do. Every other registry in this package is gated against
 * the spec — `src/schemas/` byte-for-byte, `OSPP_ERROR_REGISTRY` field-by-field, the
 * crypto corpus by cmp — and `CONFIG_KEY_REGISTRY` was compared only against itself,
 * by `tests/enums/ConfigKey.test.ts`, which counts the keys in each profile and
 * therefore stays green through any renaming of a profile. It did: this registry
 * carried `DeviceMgmt` for as long as the field existed.
 *
 * The sibling `ospp/protocol` gate found two real divergences the first time it ran.
 * It also missed the profile, for a structural reason worth stating here because it
 * shaped this file: **the profile is not in the same table as the other four
 * properties.** §§2--6 have no profile column — a key's profile is expressed there
 * by which SECTION the row sits in — so a gate built by parsing those rows sees
 * every other property and is blind to this one by construction. §1.5 is where the
 * profile is stated per key, and until spec v0.16.0 it stated only a display label:
 * `Offline / BLE` and `Device Management`, neither of which survives being made an
 * identifier. Each SDK invented a spelling — this one chose `OfflineBLE` and
 * `DeviceMgmt`, `ospp/protocol` chose `Offline` and `DeviceManagement` — and three
 * spellings of two profiles coexisted with nothing to compare them against. v0.16.0
 * adds the normative Profile ID column, and §1.5 names this gate as its consumer.
 *
 * **On the file mode.** This script has no executable bit and does not need one: CI
 * runs it as `npm run check:config-registry`, which resolves to `vite-node
 * scripts/…`, so the interpreter is named by the caller. That is deliberate. Two
 * gates in the sibling PHP package shipped at 0.13.0 as `100644` while being invoked
 * as `run: scripts/…`, and died `Permission denied` on every run with the CI column
 * green — a gate that cannot execute is indistinguishable from a gate that passes.
 * Every gate in this package is invoked through an npm script with an explicit
 * interpreter for that reason; if one is ever wired as a bare `./scripts/…`, the mode
 * becomes load-bearing and must be `100755` in the git index, not just on disk.
 *
 * Usage:
 *   npm run check:config-registry                           # clones spec at .spec-ref
 *   SPEC_REPO=/local/path npm run check:config-registry     # local checkout
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_KEY_REGISTRY } from '../src/enums/ConfigKey.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_REF = readFileSync(join(ROOT, '.spec-ref'), 'utf8').trim();

// .spec-ref is PR-mutable and is passed to `git clone --branch`. execFileSync takes
// an argv array, so there is no shell to inject into — but a value beginning with `-`
// would still be read by git as an OPTION rather than a ref. Same allowlist as the
// other three gates and the CI schemas job.
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
 * A Chapter 08 §§2--6 key row.
 *
 * The discriminator is columns 4 and 5 together: `R|RW|W` followed by
 * `Static|Dynamic`. Chapter 08 carries other tables — the value-type table, the
 * access-mode table — and none has a backticked key in column 1 AND that pair in
 * columns 4-5. It also excludes §9's summary rows, whose first cell is the index
 * number rather than the key, which is what keeps this comparison on the normative
 * sections: v0.16.0 declares §§2--6 normative and §9 derived from them.
 */
const ROW =
  /^\|\s*`([A-Za-z]+)`\s*\|\s*\*{0,2}(\w+)\*{0,2}\s*\|([^|]*)\|\s*(R|RW|W)\s*\|\s*\*{0,2}(Static|Dynamic)\*{0,2}\s*\|/;

/**
 * A §1.5 profile row: `| **Display Label** | `ProfileID` | key, key, ... | Required |`.
 *
 * Matched only inside §1.5. §§1.2, 1.3 and 1.4 are also leading-emphasis tables in
 * this chapter and a looser pattern reaches them; the section bound is what keeps
 * them out, not the pattern.
 */
const PROFILE_SECTION = /^###\s+1\.5\b/;
const PROFILE_SECTION_END = /^#{2,3}\s/;
const PROFILE_ROW = /^\|\s*\*{0,2}([A-Za-z][A-Za-z /-]*?)\*{0,2}\s*\|\s*`?([A-Za-z]+|--)`?\s*\|([^|]*)\|/;

/**
 * The Profile IDs this SDK expects §1.5 to carry.
 *
 * Not the comparison — that is per key, below. This is the vocabulary check: if the
 * spec renames or adds a profile, every key in it drifts at once and the per-key
 * output would be 4 or 9 lines of one fact. Naming the set makes that one line, and
 * makes a spec-side rename impossible to absorb silently.
 */
const EXPECTED_PROFILE_IDS = ['Core', 'DeviceManagement', 'OfflineBLE', 'Security', 'Transaction'];

/**
 * The Default cell as a comparable scalar.
 *
 * `--` means the spec states no default (read-only keys the station fills in).
 * Everything else is backticked and may carry JSON quotes: `` `"All"` `` is the
 * string All, `` `""` `` is the empty string, `` `60` `` is 60. Both are stripped so
 * the comparison is against the VALUE, not against how the table renders it.
 */
function specDefault(cell: string): string | null {
  const t = cell.trim();
  if (t === '--' || t === '—' || t === '') return null;
  return t.replace(/^[`\s]+|[`\s]+$/g, '').replace(/^"|"$/g, '');
}

interface SpecRow {
  type: string;
  default: string | null;
  access: string;
  mutability: string;
}

try {
  const md = readFileSync(join(specRoot, 'spec', '08-configuration.md'), 'utf8');
  const lines = md.split(/\r?\n/);

  // --- §§2--6: the registry rows -------------------------------------------
  const spec = new Map<string, SpecRow>();
  for (const line of lines) {
    const m = ROW.exec(line);
    if (!m) continue;
    if (spec.has(m[1])) {
      console.error(`ERROR: spec 08-configuration.md lists key ${m[1]} more than once`);
      process.exit(1);
    }
    spec.set(m[1], {
      type: m[2].toLowerCase(),
      default: specDefault(m[3]),
      access: m[4],
      mutability: m[5],
    });
  }

  // A regex that silently matches nothing would make this gate pass vacuously on any
  // reformatting of the table — the empty-dataset-is-green trap. The floor is a
  // PARSER sanity check and not an assertion about how many keys the spec has: a key
  // added or removed upstream is reported below, in both directions, and must not
  // read as a broken parser.
  if (spec.size < 25) {
    console.error(
      `ERROR: parsed only ${spec.size} rows from spec/08-configuration.md — the registry table ` +
        'format has probably changed. Refusing to report a pass; fix the parser in ' +
        'scripts/check-config-registry.ts.',
    );
    process.exit(1);
  }

  // --- §1.5: the profile of each key, by normative Profile ID ---------------
  const specProfile = new Map<string, string>();
  const profileIds = new Map<string, string>();
  let inside = false;
  for (const line of lines) {
    if (PROFILE_SECTION.test(line)) {
      inside = true;
      continue;
    }
    if (inside && PROFILE_SECTION_END.test(line)) break;
    if (!inside) continue;

    const m = PROFILE_ROW.exec(line);
    if (!m) continue;

    const label = m[1].trim();
    const id = m[2].trim();
    // The header, and the Vendor-Specific row — which states `--` because a vendor
    // key has no standard profile and this SDK models no vendor key.
    if (label === 'Profile' || id === '--') continue;

    profileIds.set(id, label);
    for (const raw of m[3].split(',')) {
      const key = raw.trim().replace(/^`|`$/g, '');
      if (key !== '') specProfile.set(key, id);
    }
  }

  // Threshold on the spec side, before any comparison. §1.5 is a DIFFERENT table
  // from the §§2--6 rows above, so the floor those cleared says nothing about this
  // one: §1.5 could reformat, yield nothing, and leave the gate reporting a clean
  // pass on four properties while checking zero keys for the fifth.
  if (profileIds.size < 5) {
    console.error(
      `ERROR: parsed only ${profileIds.size} profile row(s) from §1.5 of ` +
        'spec/08-configuration.md — the profile table format has probably changed. ' +
        'Refusing to report a pass; fix the parser in scripts/check-config-registry.ts.',
    );
    process.exit(1);
  }
  if (specProfile.size < 25) {
    console.error(
      `ERROR: §1.5 named ${specProfile.size} key(s) across its profiles, against ${spec.size} ` +
        'rows in §§2--6 — the Keys column has probably changed shape. Refusing to report a pass.',
    );
    process.exit(1);
  }

  // --- the SDK side ---------------------------------------------------------
  const sdk = new Map<string, SpecRow & { profile: string }>();
  for (const meta of Object.values(CONFIG_KEY_REGISTRY)) {
    sdk.set(meta.key, {
      type: meta.valueType.toLowerCase(),
      default: meta.defaultValue,
      access: meta.access,
      mutability: meta.mutability,
      profile: meta.profile,
    });
  }

  // Threshold on the SDK side. `Object.values` over a Record typed by the enum
  // cannot come back short today — this is here because the assertion the gate makes
  // is "N keys were compared", and a future refactor that filters this list has to
  // break the gate rather than shrink its scope quietly.
  if (sdk.size < 25) {
    console.error(
      `ERROR: CONFIG_KEY_REGISTRY yielded only ${sdk.size} key(s). Refusing to report a pass ` +
        'on a registry that small.',
    );
    process.exit(1);
  }

  // --- compare --------------------------------------------------------------
  const problems: string[] = [];

  for (const id of [...profileIds.keys()].sort()) {
    if (!EXPECTED_PROFILE_IDS.includes(id)) {
      problems.push(`§1.5 carries Profile ID '${id}', which this SDK does not know`);
    }
    // §1.5's own guarantee, checked rather than assumed: an ID that is not a bare
    // alphanumeric word cannot be used as the program value §1.5 requires it to be,
    // and this gate would then be comparing against something no SDK can adopt.
    if (!/^[A-Za-z0-9]+$/.test(id)) {
      problems.push(`Profile ID '${id}' is not usable as a program identifier`);
    }
  }
  for (const id of EXPECTED_PROFILE_IDS) {
    if (!profileIds.has(id)) {
      problems.push(`this SDK expects Profile ID '${id}', which §1.5 no longer carries`);
    }
  }

  let profilesCompared = 0;

  for (const key of [...spec.keys()].sort()) {
    const s = spec.get(key)!;
    const o = sdk.get(key);
    if (!o) {
      problems.push(`${key}: in spec, MISSING from CONFIG_KEY_REGISTRY`);
      continue;
    }

    for (const field of ['type', 'access', 'mutability'] as const) {
      if (o[field] !== s[field]) {
        problems.push(`${key}: ${field} spec=${s[field]} sdk=${o[field]}`);
      }
    }

    if (o.default !== s.default) {
      const r = (v: string | null) => (v === null ? '(none)' : `'${v}'`);
      problems.push(`${key}: default spec=${r(s.default)} sdk=${r(o.default)}`);
    }

    // A key in §§2--6 that §1.5 places in no profile is a spec defect, not a key to
    // skip: skipping it is how a key drops out of this comparison without changing
    // the count of problems.
    const sp = specProfile.get(key);
    if (sp === undefined) {
      problems.push(`${key}: in §§2--6, but §1.5 places it in no profile`);
    } else {
      if (o.profile !== sp) problems.push(`${key}: profile spec=${sp} sdk=${o.profile}`);
      profilesCompared++;
    }
  }

  for (const key of [...sdk.keys()].sort()) {
    if (!spec.has(key)) problems.push(`${key}: in CONFIG_KEY_REGISTRY, MISSING from the spec`);
  }

  // Zero compared pairs is a failure, never a pass. Every threshold above can be
  // cleared by a §1.5 that parses cleanly and a §§2--6 that parses cleanly while the
  // two name DISJOINT key sets — each side full, the intersection empty, no key
  // compared and no problem raised. This is the assertion the gate actually makes,
  // so it is the one that has to be stated rather than inferred from silence.
  if (profilesCompared === 0) {
    console.error(
      'ERROR: zero key/profile pairs were compared. §1.5 and §§2--6 parsed but name disjoint ' +
        'key sets, so the profile check ran against nothing. Refusing to report a pass; fix ' +
        'the parser in scripts/check-config-registry.ts.',
    );
    process.exit(1);
  }

  console.log(
    `spec ${SPEC_REF}: ${spec.size} keys, ${profileIds.size} profiles    ` +
      `SDK registry: ${sdk.size} keys    profiles compared: ${profilesCompared}`,
  );

  if (problems.length > 0) {
    console.error(
      `\nDRIFT between the SDK configuration registry and spec ${SPEC_REF} — ${problems.length} problem(s):\n`,
    );
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      '\nFix: change the SDK to match the spec. Chapter 08 is the source of truth for type,' +
        '\ndefault, access and mutability (§§2--6) and for the profile (§1.5, the Profile ID' +
        '\ncolumn — NOT the display label beside it). If the SPEC is what is wrong, fix it' +
        '\nthere first and re-pin .spec-ref — do not "correct" it here.' +
        '\n\nA fix to the registry must also update tests/enums/ConfigKey.test.ts, which' +
        '\nenumerates several of these answers by hand and will otherwise keep asserting the' +
        '\nold one.',
    );
    process.exit(1);
  }

  console.log(
    `OK — all ${spec.size} keys agree with spec ${SPEC_REF} on type, default, access and ` +
      `mutability, and all ${profilesCompared} agree with §1.5 on the normative Profile ID`,
  );
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
