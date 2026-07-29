#!/usr/bin/env node
// Type-check the spec's own conformance vectors against this SDK's hand-written
// types, under tsc --strict.
//
// WHY THIS EXISTS
// ---------------
// scripts/check-schemas.sh diffs the vendored schema trees byte-for-byte, so a
// schema can never drift from the spec. The hand-written types in src/types/ are
// outside that gate entirely — nothing checked they still described the schemas
// sitting next to them. Two of them had drifted (v0.9.0): the BootNotification
// Rejected variant was missing errorCode/errorText, and signalStrength could not
// hold the null its schema permits. Both were invisible to every existing gate,
// and the SDK's own unit test had enshrined the first one.
//
// This closes that gap for the vectors listed below: it assigns each vector to
// the type the SDK claims describes it, and fails if the type is narrower.
//
// SCOPE — this is a seed, not full coverage.
// ------------------------------------------
// VECTORS below is explicit rather than derived. Covering all ~43 valid/core
// vectors automatically would need to solve one problem this does not:
// TypeScript string enums are NOMINAL, so a JSON string never assigns to an
// enum-typed field. `"PowerOn"` is not assignable to BootReason even though
// BootReason.POWER_ON === "PowerOn". A general version therefore needs to know
// which fields are enum-typed — either by consulting each vendored schema for
// `enum` and matching its value-set against the SDK's 7 string enums, or by
// reading types out of the TypeScript compiler API. Either is a real piece of
// work; neither is a one-liner. Until then, ENUM_FIELDS names them by hand.
//
// Adding a vector is one line in VECTORS. Do that when a payload type changes.
//
// Usage:
//   node scripts/check-vector-types.mjs                    # clones spec at .spec-ref
//   SPEC_REPO=/local/path node scripts/check-vector-types.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_REF = readFileSync(join(ROOT, '.spec-ref'), 'utf8').trim();

// .spec-ref is PR-mutable and is passed to `git clone --branch`. execFileSync
// takes an argv array, so there is no shell to inject into — but a value
// beginning with `-` would still be read by git as an OPTION rather than a ref
// (e.g. `--upload-pack=...`). Validate against the same SemVer-tag allowlist
// the CI schemas job uses, before the value reaches any argv.
if (!/^v\d+\.\d+\.\d+(-[a-zA-Z0-9._-]+)?$/.test(SPEC_REF)) {
  console.error(`ERROR: .spec-ref value '${SPEC_REF}' does not match SemVer tag pattern (v<MAJOR>.<MINOR>.<PATCH>[-prerelease])`);
  process.exit(1);
}

// vector path (relative to the spec repo root) → the SDK type it must satisfy.
const V = 'conformance/test-vectors/valid/core';
const VECTORS = [
  [`${V}/boot-notification-response-rejected.json`, 'BootNotificationResponse'],
  [`${V}/boot-notification-response-rejected-version-mismatch.json`, 'BootNotificationResponse'],
  [`${V}/boot-notification-response-minimal.json`, 'BootNotificationResponse'],
  [`${V}/boot-notification-response-full.json`, 'BootNotificationResponse'],
  [`${V}/boot-notification-response-pending.json`, 'BootNotificationResponse'],
  [`${V}/boot-notification-request-minimal.json`, 'BootNotificationRequest'],
  [`${V}/boot-notification-request-full.json`, 'BootNotificationRequest'],
  [`${V}/boot-notification-request-remote.json`, 'BootNotificationRequest'],
  [`${V}/boot-notification-request-watchdog.json`, 'BootNotificationRequest'],
  [`${V}/boot-notification-request-scheduled.json`, 'BootNotificationRequest'],
  [`${V}/boot-notification-request-error-recovery.json`, 'BootNotificationRequest'],
  ['examples/payloads/mqtt/boot-notification.request.json', 'BootNotificationRequest'],
];

const IMPORTS = [
  "import type { BootNotificationRequest, BootNotificationResponse } from './src/types/payloads/boot-notification.js';",
  "import { BootReason } from './src/enums/BootReason.js';",
];

// Fields whose declared type is a nominal string enum — see SCOPE above.
const ENUM_FIELDS = { bootReason: 'BootReason' };

let specRoot = process.env.SPEC_REPO;
let tmp;
if (specRoot) {
  console.log(`Comparing against local spec checkout at ${specRoot} (.spec-ref=${SPEC_REF} — not enforced for local mode)`);
} else {
  tmp = mkdtempSync(join(tmpdir(), 'ospp-spec-'));
  specRoot = join(tmp, 'spec');
  console.log(`Cloning ospp-org/spec at ${SPEC_REF}...`);
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', SPEC_REF,
    'https://github.com/ospp-org/spec.git', specRoot], { stdio: 'inherit' });
}

// Build the enum value → member map so a vector's raw string can be emitted as
// the member whose VALUE is byte-identical to it.
const memberOf = {};
for (const enumName of new Set(Object.values(ENUM_FIELDS))) {
  const src = readFileSync(join(ROOT, 'src/enums', `${enumName}.ts`), 'utf8');
  memberOf[enumName] = Object.fromEntries(
    [...src.matchAll(/(\w+)\s*=\s*'([^']+)'/g)].map(([, member, value]) => [value, member]),
  );
}

const lines = ['// GENERATED by scripts/check-vector-types.mjs — do not edit, do not commit.', ...IMPORTS, ''];
let missing = 0;
VECTORS.forEach(([rel, type], i) => {
  let raw;
  try {
    raw = readFileSync(join(specRoot, rel), 'utf8');
  } catch {
    console.error(`  ! vector not found in spec ${SPEC_REF}: ${rel}`);
    missing++;
    return;
  }
  const data = JSON.parse(raw);
  let literal = JSON.stringify(data, null, 2);
  for (const [field, enumName] of Object.entries(ENUM_FIELDS)) {
    if (!(field in data)) continue;
    const member = memberOf[enumName][data[field]];
    if (!member) {
      console.error(`  ! ${rel}: ${field}="${data[field]}" is not a member value of ${enumName}`);
      missing++;
      return;
    }
    literal = literal.replace(`"${field}": ${JSON.stringify(data[field])}`, `"${field}": ${enumName}.${member}`);
  }
  lines.push(`// ${rel}`, `export const v${i}: ${type} = ${literal};`, '');
});

const outFile = join(ROOT, '__vector-types.generated.ts');
writeFileSync(outFile, lines.join('\n'));

let failed = missing > 0;
try {
  execFileSync(join(ROOT, 'node_modules/.bin/tsc'), [
    '--noEmit', '--strict', '--target', 'ES2022',
    '--module', 'NodeNext', '--moduleResolution', 'NodeNext',
    '--skipLibCheck', outFile,
  ], { stdio: 'inherit' });
} catch {
  failed = true;
}

rmSync(outFile, { force: true });
if (tmp) rmSync(tmp, { recursive: true, force: true });

if (missing > 0) {
  console.error('');
  console.error(`FAIL — ${missing} vector(s) listed in VECTORS are absent from spec ${SPEC_REF}.`);
  console.error('Either the vector was renamed upstream, or VECTORS is stale. Fix the list.');
  process.exit(1);
}
if (failed) {
  console.error('');
  console.error('FAIL — a spec vector does not satisfy the SDK type that claims to describe it.');
  console.error('A hand-written type in src/types/ is narrower than its vendored schema.');
  console.error('Fix the type, not the vector.');
  process.exit(1);
}
console.log(`OK — ${VECTORS.length} spec vectors type-check against their SDK types (spec ${SPEC_REF})`);
