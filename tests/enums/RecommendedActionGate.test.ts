/**
 * `scripts/check-recommended-action.ts` does what its header claims, and — the
 * load-bearing half — does NOT do the thing 07-errors.md §1.4 forbids.
 *
 * §1.4 permits a server to translate a `recommendedAction`, and concludes that a
 * conformance test therefore **MUST NOT** assert byte-identity against the registry
 * cell. A gate written as a diff would break the section it exists to enforce, and
 * nothing in a green CI run would ever say so — a diff and a coverage check look
 * identical from the outside while every arm happens to be verbatim, which is
 * exactly the state this repository is in today. So the property is asserted here
 * rather than trusted.
 *
 * Each case builds a SYNTHETIC spec tree holding a mutated copy of 07-errors.md and
 * runs the real gate against it. Mutating the spec side rather than the SDK side is
 * what makes the first test possible at all: the arm stays as shipped while the cell
 * is rewritten underneath it, so a gate that compares the two has nowhere to hide.
 *
 * The mirror of `ospp-sdk-php`'s `tests/Contract/RecommendedActionGateTest.php`.
 * The six mutations are the same six, and both gates answer them identically —
 * which is the point of running them on both sides rather than one.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPEC_REPO = process.env.SPEC_REPO;

const registry = (): string | undefined => {
  if (!SPEC_REPO) return undefined;
  try {
    return readFileSync(join(SPEC_REPO, 'spec', '07-errors.md'), 'utf8');
  } catch {
    return undefined;
  }
};

/** Run the real gate against a spec tree whose 07-errors.md is `md`. */
const runGate = (md: string): { exit: number; out: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'ospp-gate-'));
  try {
    mkdirSync(join(dir, 'spec'), { recursive: true });
    writeFileSync(join(dir, 'spec', '07-errors.md'), md);
    try {
      const out = execFileSync('npx', ['vite-node', 'scripts/check-recommended-action.ts'], {
        cwd: ROOT,
        env: { ...process.env, SPEC_REPO: dir },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { exit: 0, out };
    } catch (e) {
      const err = e as { status?: number; stdout?: string; stderr?: string };
      return { exit: err.status ?? -1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/** The full source line of the §3 row for `code`. */
const row = (md: string, code: number): string => {
  const line = md.split(/\r?\n/).find((l) => new RegExp(`^\\|\\s*${code}\\s*\\|`).test(l));
  if (!line) throw new Error(`no §3 row for code ${code}`);
  return line;
};

/** Replace the trailing *Recommended Action* cell of `code` with `action`. */
const withAction = (md: string, code: number, action: string): string => {
  const old = row(md, code);
  const last = old.lastIndexOf('|', old.trimEnd().length - 1);
  const head = old.slice(0, old.lastIndexOf('|', last - 1));
  return md.replace(old, `${head}| ${action} |`);
};

const md = registry();

// A skip is the correct answer on a developer's machine with no spec checkout to
// hand. In CI it is the WRONG answer, and it is the failure mode this whole file
// exists to rule out one level down: green skips read exactly like green passes in
// the run summary, so the gate would be unguarded and the column would still be
// green. The `test` job in ci.yml clones the spec and exports SPEC_REPO for
// precisely this reason; if that step is ever dropped, this fails rather than
// quietly stops testing anything.
if (!md && process.env.CI) {
  throw new Error(
    'SPEC_REPO is unset under CI — these mutation tests would SKIP, which reads as green. ' +
      'The `test` job must clone the spec at .spec-ref and export SPEC_REPO.',
  );
}

describe.skipIf(!md)('check-recommended-action gate', () => {
  const spec = (): string => {
    // Anti-vacuity on the FIXTURE, before it is used to prove anything. A truncated
    // or moved registry would otherwise make every case below pass for the wrong
    // reason.
    const rows = md!.match(/^\|\s*\d{4}\s*\|\s*`[A-Z_]+`\s*\|/gm) ?? [];
    expect(rows.length, 'fixture registry parsed as fewer than 100 rows — the mutations would prove nothing').
      toBeGreaterThanOrEqual(100);
    return md!;
  };

  it('passes against the pinned registry, unmutated', () => {
    const { exit, out } = runGate(spec());
    expect(out).toContain('covered 119/119');
    expect(exit).toBe(0);
  });

  /**
   * THE ONE THAT MATTERS. The cell is rewritten end to end — a different language,
   * different words, different length — keeping only what a translation keeps: the
   * protocol tokens and the fact that two parties are addressed. The shipped arm is
   * untouched and is now nothing like it.
   *
   * A gate with any byte comparison in it fails here. This one must stay green,
   * because §1.4 says a translation is conforming and a conformance test may not
   * say otherwise.
   */
  it('accepts a cell rewritten in another language', () => {
    const mutated = withAction(
      spec(),
      4018,
      'Statie: NU regenera chei pe niciun brat - o cheie noua primeste raspunsul `4015`. ' +
        'Ramifica pe `details.reason`. `already_consumed` - alta cerere detine acest token; reia neschimbat. ' +
        '`consumed_without_certificate` - cere un token nou. Operator: emite un token proaspat.',
    );
    const { exit, out } = runGate(mutated);
    expect(out, 'a translated cell must not fail the gate — §1.4 permits translation').not.toContain('FAIL');
    expect(exit).toBe(0);
  });

  it('fails on a registry code with no arm', () => {
    const base = spec();
    const mutated = base.replace(
      row(base, 6008),
      `${row(base, 6008)}\n| 6009 | \`NEW_SERVER_CODE\` | Error | true | A code no SDK has seen. | Server: do the new thing. |`,
    );
    const { exit, out } = runGate(mutated);
    expect(exit).toBe(1);
    expect(out).toContain('COVERAGE');
    expect(out).toContain('6009');
  });

  /**
   * A gate that reports a pass over an empty set is worse than no gate: it is a
   * green column that means nothing. Every one of the eight checks passes vacuously
   * over zero rows, so the floor is asserted before any of them run.
   */
  it('refuses to pass over an empty registry', () => {
    const { exit, out } = runGate(spec().replace(/^\|\s*\d{4}\s*\|.*$/gm, ''));
    expect(exit).toBe(1);
    expect(out).toContain('parsed only 0 rows');
  });

  it('fails when an arm drops a branch discriminator', () => {
    const { exit, out } = runGate(
      withAction(spec(), 1010, "Retry per the action's retry policy. Branch on `details.newBranch`."),
    );
    expect(exit).toBe(1);
    expect(out).toContain('DISCRIMINATOR');
  });

  it('fails when an arm drops an addressed party', () => {
    const { exit, out } = runGate(withAction(spec(), 1010, 'Station: retry per the policy. Server: log the timeout.'));
    expect(exit).toBe(1);
    expect(out).toContain('PARTY');
  });

  it('fails when an arm drops a cited registry code', () => {
    const { exit, out } = runGate(withAction(spec(), 1010, 'Retry per the policy; a fresh key is answered `4015`.'));
    expect(exit).toBe(1);
    expect(out).toContain('CODE-REF');
  });
});
