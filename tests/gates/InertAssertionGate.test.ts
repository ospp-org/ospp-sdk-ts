/**
 * `scripts/check-inert-assertions.mjs` can actually SEE the defect it is for.
 *
 * A gate over a property that is currently satisfied everywhere is
 * indistinguishable, from inside a green run, from a gate that reports nothing.
 * That is the same failure one level down that the gate itself exists to catch:
 * `expect(15 + 20 + 20 + 20 + 34 + 9).toBe(118)` was green in every tag this
 * repository carries, and green meant nothing. So the gate's own sight is
 * asserted here rather than trusted.
 *
 * Each case builds a SYNTHETIC test tree in a temporary directory and runs the
 * real script against it with `--root`. Nothing here reads or mutates this
 * repository's own tests.
 *
 * Same shape as `tests/enums/RecommendedActionGate.test.ts`, which does this for
 * the recommendedAction gate.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Run the real gate against a synthetic tree.
 *
 * @param testSource contents of `tests/sample.test.ts` in that tree
 * @param allow      contents of `.inert-assertions.json`, or null for none
 */
function runGate(testSource: string, allow: unknown | null = null): { exit: number; out: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ospp-inert-'));
  try {
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests', 'sample.test.ts'), testSource);
    if (allow !== null) writeFileSync(join(dir, '.inert-assertions.json'), JSON.stringify(allow, null, 2));
    try {
      const out = execFileSync('node', [join(ROOT, 'scripts', 'check-inert-assertions.mjs'), '--root', dir], {
        cwd: ROOT,
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
}

const PREAMBLE = `import { describe, it, expect } from 'vitest';\nimport { Thing } from '../src/Thing';\n`;

describe('check-inert-assertions gate', () => {
  it('passes against this repository as it stands', () => {
    // Positive control for the two negative results below: the script runs, reads
    // a non-empty corpus, and agrees with .inert-assertions.json.
    const out = execFileSync('node', [join(ROOT, 'scripts', 'check-inert-assertions.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(out).toContain('OK --');
    expect(out).toMatch(/assertions examined\s+\d{3,}/); // not a corpus of nothing
  });

  it('catches the literal-against-literal form that started this', () => {
    const r = runGate(`${PREAMBLE}
it('15 + 20 + 20 + 20 + 34 + 9 = 118', () => {
  expect(15 + 20 + 20 + 20 + 34 + 9).toBe(118);
});
`);
    expect(r.exit).toBe(1);
    expect(r.out).toContain('inert assertion');
    expect(r.out).toContain('expect(15 + 20 + 20 + 20 + 34 + 9).toBe(118)');
  });

  it('catches the same defect written through local constants', () => {
    // The form in payloads.test.ts. Two named constants are not a reader.
    const r = runGate(`${PREAMBLE}
it('should have 27 payload files matching 27 actions', () => {
  const reqResActions = 20;
  const eventActions = 7;
  expect(reqResActions + eventActions).toBe(27);
});
`);
    expect(r.exit).toBe(1);
    expect(r.out).toContain('expect(reqResActions + eventActions).toBe(27)');
  });

  it('catches a literal list compared to its own literal length', () => {
    const r = runGate(`${PREAMBLE}
it('should have 3 of them', () => {
  const items = ['a', 'b', 'c'];
  expect(items).toHaveLength(3);
});
`);
    expect(r.exit).toBe(1);
  });

  it('does NOT fire when a side reads src/', () => {
    // The half that matters: a gate that reported everything would be useless in
    // the other direction, and would have to be switched off.
    const r = runGate(`${PREAMBLE}
it('reads the enum', () => {
  expect(Object.values(Thing)).toHaveLength(3);
  expect(Object.values(Thing).length).toBe(Object.keys(Thing).length);
});
`);
    expect(r.exit).toBe(0);
    expect(r.out).toContain('inert found          0');
  });

  it('does NOT fire on a const array that is mutated afterwards', () => {
    // `const rows = []` followed by `rows.push(...)` binds a constant name to a
    // value that is not constant. Folding it would report a live assertion.
    const r = runGate(`${PREAMBLE}
it('collects', () => {
  const rows: string[] = [];
  for (const t of Object.values(Thing)) rows.push(t);
  expect(rows).toHaveLength(3);
});
`);
    expect(r.exit).toBe(0);
  });

  it('does NOT fire on a matcher with no expected argument', () => {
    const r = runGate(`${PREAMBLE}
it('is defined', () => {
  expect(42).toBeDefined();
  expect(() => { throw new Error('x'); }).toThrow();
});
`);
    expect(r.exit).toBe(0);
  });

  it('accepts an inert assertion that carries a declared reason', () => {
    const source = `${PREAMBLE}
it('is about JavaScript', () => {
  expect('x'.length).toBe(1);
});
`;
    const r = runGate(source, {
      exempt: { "tests/sample.test.ts :: expect('x'.length).toBe(1)": 'A fact about JavaScript, not about this repository.' },
    });
    expect(r.exit).toBe(0);
    expect(r.out).toContain('declared exempt      1');
  });

  it('fails on an exemption that no longer matches anything', () => {
    // A licence must not outlive the assertion it excused. Without this, fixing
    // an assertion leaves behind a silent permission for the next one to reuse.
    const r = runGate(
      `${PREAMBLE}
it('reads the enum', () => {
  expect(Object.values(Thing)).toHaveLength(3);
});
`,
      {
        exempt: {
          'tests/sample.test.ts :: expect(1 + 1).toBe(2)':
            'A well-written reason for an assertion that no longer exists in this tree.',
        },
      },
    );
    expect(r.exit).toBe(1);
    expect(r.out).toContain('match nothing');
  });

  it('rejects an exemption with no reason written against it', () => {
    // A bare licence is indistinguishable from a forgotten one.
    const r = runGate(
      `${PREAMBLE}
it('x', () => { expect(1).toBe(1); });
`,
      { exempt: { 'tests/sample.test.ts :: expect(1).toBe(1)': 'because' } },
    );
    expect(r.exit).toBe(1);
    expect(r.out).toContain('no usable reason');
  });

  it('reports a malformed exemption file as such, not as a crash', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ospp-inert-badjson-'));
    try {
      mkdirSync(join(dir, 'tests'), { recursive: true });
      writeFileSync(join(dir, 'tests', 'sample.test.ts'), `${PREAMBLE}
it('x', () => { expect(Object.values(Thing)).toHaveLength(1); });
`);
      writeFileSync(join(dir, '.inert-assertions.json'), '{ not json');
      let exit = 0;
      let out = '';
      try {
        out = execFileSync('node', [join(ROOT, 'scripts', 'check-inert-assertions.mjs'), '--root', dir], {
          cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (e) {
        const err = e as { status?: number; stdout?: string; stderr?: string };
        exit = err.status ?? -1;
        out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
      }
      expect(exit).toBe(1);
      expect(out).toContain('is not valid JSON');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses to pass over a corpus it could not read', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ospp-inert-empty-'));
    try {
      mkdirSync(join(dir, 'tests'), { recursive: true });
      let exit = 0;
      let out = '';
      try {
        out = execFileSync('node', [join(ROOT, 'scripts', 'check-inert-assertions.mjs'), '--root', dir], {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (e) {
        const err = e as { status?: number; stdout?: string; stderr?: string };
        exit = err.status ?? -1;
        out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
      }
      expect(exit).toBe(1);
      expect(out).toContain('Refusing to pass');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
