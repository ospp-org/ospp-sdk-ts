#!/usr/bin/env node
// Gate: no assertion in the test corpus may be inert.
//
// WHY THIS EXISTS
// ---------------
// `tests/enums/OsppErrorCode.test.ts` carried
//
//     it('15 + 20 + 20 + 20 + 34 + 9 = 118', () => {
//       expect(15 + 20 + 20 + 20 + 34 + 9).toBe(118);
//     });
//
// for every tag this repository has ever cut. Both sides fold to 118 at compile
// time, so it read nothing, described nothing, and would have passed over an
// empty registry, a renamed enum and a deleted one alike. It was also wrong
// twice -- its 5xxx term disagreed with the assertion seven lines above it and
// its total with the one thirty-seven lines above -- and had been wrong since
// 0.31.0, because the two neighbouring assertions that DO read the registry were
// updated at that release and this one was not. Being green was not evidence of
// anything: an assertion that cannot fail is not a weak test, it is a claim made
// with no check attached.
//
// It was not alone. `tests/actions/OsppAction.test.ts` carried two more of the
// same shape (`11 + 14 + 1 + 1 === 27` and `20 + 7 === 27`) and
// `tests/types/payloads.test.ts` a third, dressed in two local constants
// (`const reqResActions = 20; const eventActions = 7;`) under a title that
// claimed to have counted the payload directory. None of the four could be found
// by grepping for a number, because the numbers were all correct; what was wrong
// was that nothing computed them.
//
// WHAT IT CHECKS
// --------------
// Every `expect(actual).matcher(expected)` in `tests/`, on the TypeScript AST.
// An assertion is INERT when both `actual` and `expected` fold to compile-time
// constants, so that no change anywhere in `src/` can move either side. Folding
// goes through local `const` bindings -- `const a = 20; const b = 7;
// expect(a + b).toBe(27)` is the same defect written at one remove -- but stops
// at any binding that is ever mutated, and at anything that reads an import from
// `src/`, the filesystem, or a dynamic `import()` of either.
//
// WHAT IT CANNOT SEE, STATED PLAINLY
// ----------------------------------
//   - An assertion whose expected side is a literal and whose actual side is a
//     hand-written list in the test file. `expect(theList).toHaveLength(11)`
//     where `theList` is eleven entries written above it cannot be moved by
//     `src/` either, but it also cannot be distinguished from a deliberate
//     transcription pin without knowing intent. There are 93 of those and they
//     are not reported; the partition assertions in `OsppAction.test.ts` are the
//     pattern for making one answerable to the enum.
//   - An assertion carried by a TYPE ANNOTATION rather than by the `expect`.
//     `const empty: MeterValues = {}` is a real claim checked by `tsc`, not by
//     vitest. That check is `npm run typecheck`, which CI runs as its own job.
//   - A test with no assertion in it at all.
//   - A matcher used wrongly (`toBe` on an object, a forgotten `await`).
//
// EXEMPTIONS
// ----------
// `.inert-assertions.json`, same shape and same discipline as
// `.release-gaps.json`: an entry is a written statement that the assertion is
// deliberately about arithmetic and not about this repository, not a way to stop
// the gate asking. An exemption that no longer matches anything FAILS, so a site
// that is fixed or deleted cannot leave a silent licence behind it.
//
// Usage:
//   npm run check:inert-assertions
//   node scripts/check-inert-assertions.mjs [--root <dir>]

import ts from 'typescript';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const rootFlag = argv.indexOf('--root');
if (rootFlag >= 0 && !argv[rootFlag + 1]) {
  console.error('ERROR: --root was given with no directory after it.');
  process.exit(1);
}
const ROOT = rootFlag >= 0 ? argv[rootFlag + 1] : join(dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = join(ROOT, 'tests');
const ALLOW_FILE = join(ROOT, '.inert-assertions.json');

/** An import specifier that reaches this package's own source tree. */
const SRC_SPEC = /(^|\/)src\//;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** `expect(a).m(b)` rendered so the key survives the assertion moving lines. */
const keyOf = (file, a, matcher, e) => `${file} :: expect(${a}).${matcher}(${e})`;
const squash = (n, sf) => n.getText(sf).replace(/\s+/g, ' ').trim();

function scanFile(file) {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true);
  const bindings = new Map();

  const namesOf = (nameNode, sink) => {
    if (ts.isIdentifier(nameNode)) return void sink.push(nameNode.text);
    if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode))
      for (const el of nameNode.elements) if (ts.isBindingElement(el)) namesOf(el.name, sink);
  };

  const collectImport = (node) => {
    if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier.text;
      const kind =
        SRC_SPEC.test(spec) || spec.startsWith('node:') || spec === 'fs' || spec === 'path'
          ? 'SOURCE'
          : 'EXTERNAL';
      const c = node.importClause;
      if (c) {
        if (c.name) bindings.set(c.name.text, kind);
        if (c.namedBindings) {
          if (ts.isNamedImports(c.namedBindings))
            for (const el of c.namedBindings.elements) bindings.set(el.name.text, kind);
          else if (ts.isNamespaceImport(c.namedBindings)) bindings.set(c.namedBindings.name.text, kind);
        }
      }
    }
    ts.forEachChild(node, collectImport);
  };
  collectImport(sf);

  const readsSource = (node) => {
    if (!node) return false;
    let hit = false;
    const visit = (n) => {
      if (hit) return;
      if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const a = n.arguments[0];
        if (a && ts.isStringLiteralLike(a) && SRC_SPEC.test(a.text)) return void (hit = true);
      }
      if (ts.isIdentifier(n) && bindings.get(n.text) === 'SOURCE') return void (hit = true);
      ts.forEachChild(n, visit);
    };
    visit(node);
    return hit;
  };

  const decls = [];
  const collectDecls = (n) => {
    if (ts.isVariableDeclaration(n)) {
      const names = [];
      namesOf(n.name, names);
      decls.push({
        names,
        init: n.initializer ?? null,
        isConst: n.parent && ts.isVariableDeclarationList(n.parent) && (n.parent.flags & ts.NodeFlags.Const) !== 0,
        single: ts.isIdentifier(n.name) ? n.name.text : null,
      });
    }
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name && ts.isIdentifier(n.name))
      decls.push({ names: [n.name.text], init: n.body ?? null, isConst: false, single: null });
    ts.forEachChild(n, collectDecls);
  };
  collectDecls(sf);

  for (let i = 0; i < 8; i++) {
    let changed = false;
    for (const d of decls) {
      const src = readsSource(d.init);
      for (const nm of d.names) {
        const cur = bindings.get(nm);
        if (src && cur !== 'SOURCE') { bindings.set(nm, 'SOURCE'); changed = true; }
        else if (!cur) { bindings.set(nm, 'LOCAL'); changed = true; }
      }
    }
    if (!changed) break;
  }

  // A `const` bound to an array or object literal is still mutable through its
  // methods. `const valid = []` followed by `valid.push(...)` is not a constant,
  // and folding it as one would report a live assertion as inert.
  const mutated = new Set();
  const MUT = new Set(['push','pop','shift','unshift','splice','sort','reverse','fill','copyWithin','add','delete','set','clear']);
  const scanMut = (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
        && ts.isIdentifier(n.expression.expression) && MUT.has(n.expression.name.text))
      mutated.add(n.expression.expression.text);
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      let t = n.left;
      while (ts.isPropertyAccessExpression(t) || ts.isElementAccessExpression(t)) t = t.expression;
      if (ts.isIdentifier(t)) mutated.add(t.text);
    }
    if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && ts.isIdentifier(n.operand))
      mutated.add(n.operand.text);
    ts.forEachChild(n, scanMut);
  };
  scanMut(sf);

  const constEnv = new Map();

  function fold(node) {
    if (!node) return { const: false };
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)
        || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(node))) return fold(node.expression);
    if (ts.isNumericLiteral(node)) return { const: true, value: Number(node.text) };
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { const: true, value: node.text };
    const K = ts.SyntaxKind;
    if (node.kind === K.TrueKeyword) return { const: true, value: true };
    if (node.kind === K.FalseKeyword) return { const: true, value: false };
    if (node.kind === K.NullKeyword) return { const: true, value: null };
    if (ts.isPrefixUnaryExpression(node)) {
      const i = fold(node.operand);
      if (!i.const) return { const: false };
      if (node.operator === K.MinusToken) return { const: true, value: -i.value };
      if (node.operator === K.PlusToken) return { const: true, value: +i.value };
      if (node.operator === K.ExclamationToken) return { const: true, value: !i.value };
      return { const: false };
    }
    if (ts.isBinaryExpression(node)) {
      const l = fold(node.left), r = fold(node.right);
      if (!l.const || !r.const) return { const: false };
      const op = node.operatorToken.kind;
      if (op === K.PlusToken) return { const: true, value: l.value + r.value };
      if (op === K.MinusToken) return { const: true, value: l.value - r.value };
      if (op === K.AsteriskToken) return { const: true, value: l.value * r.value };
      if (op === K.SlashToken) return { const: true, value: l.value / r.value };
      if (op === K.PercentToken) return { const: true, value: l.value % r.value };
      if (op === K.AsteriskAsteriskToken) return { const: true, value: l.value ** r.value };
      return { const: false };
    }
    if (ts.isArrayLiteralExpression(node)) {
      const parts = node.elements.map(fold);
      return parts.every((p) => p.const) ? { const: true, value: parts.map((p) => p.value) } : { const: false };
    }
    if (ts.isObjectLiteralExpression(node)) {
      const parts = node.properties.map((p) => (ts.isPropertyAssignment(p) ? fold(p.initializer) : { const: false }));
      return parts.every((p) => p.const) ? { const: true, value: {} } : { const: false };
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'length') {
      const b = fold(node.expression);
      if (b.const && (Array.isArray(b.value) || typeof b.value === 'string'))
        return { const: true, value: b.value.length };
      return { const: false };
    }
    if (ts.isIdentifier(node)) {
      if (bindings.get(node.text) !== 'SOURCE' && constEnv.has(node.text))
        return { const: true, value: constEnv.get(node.text) };
      return { const: false };
    }
    return { const: false };
  }

  for (let round = 0; round < 8; round++) {
    let changed = false;
    for (const d of decls) {
      if (!d.isConst || !d.single) continue;
      const nm = d.single;
      if (constEnv.has(nm) || bindings.get(nm) === 'SOURCE' || mutated.has(nm)) continue;
      const r = fold(d.init);
      if (r.const) { constEnv.set(nm, r.value); changed = true; }
    }
    if (!changed) break;
  }

  const rel = relative(ROOT, file);
  const found = [];
  let assertions = 0;

  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      let cur = node.expression.expression;
      while (ts.isPropertyAccessExpression(cur)) cur = cur.expression;
      if (ts.isCallExpression(cur) && ts.isIdentifier(cur.expression) && cur.expression.text === 'expect') {
        assertions++;
        const aN = cur.arguments[0], eN = node.arguments[0];
        // A matcher with no argument (`toBeDefined`, `toThrow`) has nothing on
        // the expected side to be constant, so it is never inert by this rule.
        if (aN && eN && fold(aN).const && fold(eN).const) {
          found.push({
            key: keyOf(rel, squash(aN, sf), node.expression.name.text, squash(eN, sf)),
            file: rel,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { found, assertions };
}

// ── run ──────────────────────────────────────────────────────────────────────

if (!existsSync(TESTS)) {
  console.error(`ERROR: no tests/ directory under ${ROOT}. Nothing was scanned.`);
  process.exit(1);
}

const files = walk(TESTS).sort();
let assertions = 0;
const found = [];
for (const f of files) {
  const r = scanFile(f);
  assertions += r.assertions;
  found.push(...r.found);
}

// Refuse to pass vacuously. A scan that reaches no file or parses no assertion
// is the failure this gate exists to prevent, one level up.
if (files.length === 0 || assertions === 0) {
  console.error(`ERROR: scanned ${files.length} test files and found ${assertions} assertions.`);
  console.error('A gate over an empty corpus reports nothing and proves nothing. Refusing to pass.');
  process.exit(1);
}

let allow = { exempt: {} };
if (existsSync(ALLOW_FILE)) {
  // A malformed exemption file must not surface as a stack trace that reads like
  // a crash in the scanner. It is the one input to this gate a person edits.
  try {
    allow = JSON.parse(readFileSync(ALLOW_FILE, 'utf8'));
  } catch (e) {
    console.error(`ERROR: ${relative(ROOT, ALLOW_FILE)} is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  if (allow.exempt && typeof allow.exempt !== 'object') {
    console.error(`ERROR: ${relative(ROOT, ALLOW_FILE)} has an "exempt" that is not an object.`);
    process.exit(1);
  }
}
const exempt = allow.exempt ?? {};

// An exemption with no reason written against it is the thing this file exists to
// prevent: a bare licence is indistinguishable from a forgotten one.
const unexplained = Object.entries(exempt).filter(([, why]) => typeof why !== 'string' || why.trim().length < 20);
if (unexplained.length) {
  console.error(`FAIL -- ${unexplained.length} exemption(s) carry no usable reason:`);
  for (const [k] of unexplained) console.error(`  ${k}`);
  console.error('');
  console.error('An entry here is a written statement that the assertion makes no claim about this');
  console.error('repository. Write the statement.');
  process.exit(1);
}

const undeclared = found.filter((f) => !Object.prototype.hasOwnProperty.call(exempt, f.key));
const stale = Object.keys(exempt).filter((k) => !found.some((f) => f.key === k));

console.log('inert assertions -- both sides fold to compile-time constants');
console.log(`  test files scanned   ${files.length}`);
console.log(`  assertions examined  ${assertions}`);
console.log(`  inert found          ${found.length}`);
console.log(`  declared exempt      ${Object.keys(exempt).length}`);
console.log('');

if (undeclared.length) {
  console.error(`FAIL -- ${undeclared.length} inert assertion(s) with no declared reason:`);
  for (const f of undeclared) console.error(`  ${f.file}:${f.line}\n    ${f.key.split(' :: ')[1]}`);
  console.error('');
  console.error('Both sides of these fold to constants, so nothing in src/ can make them fail.');
  console.error('Either make a side read what the assertion claims to describe, or, if the');
  console.error('assertion really is about arithmetic and not about this repository, declare it');
  console.error(`in ${relative(ROOT, ALLOW_FILE)} with the reason.`);
}

if (stale.length) {
  console.error(`FAIL -- ${stale.length} exemption(s) in ${relative(ROOT, ALLOW_FILE)} match nothing:`);
  for (const k of stale) console.error(`  ${k}`);
  console.error('');
  console.error('The assertion was fixed, moved or deleted. Remove the exemption: a licence left');
  console.error('behind outlives the thing it excused and silently covers the next one.');
}

if (undeclared.length || stale.length) process.exit(1);

console.log(`OK -- every inert assertion is declared, and every declaration still matches.`);
