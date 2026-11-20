import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from '../src/csv.js';

const BIN = fileURLToPath(new URL('../bin/csv2json.js', import.meta.url));

describe('parse', () => {
  test('basic rows', () => {
    assert.deepEqual(parse('a,b\nc,d'), [['a', 'b'], ['c', 'd']]);
  });

  test('quoted fields with commas', () => {
    assert.deepEqual(parse('"a,b",c'), [['a,b', 'c']]);
  });

  test('escaped quotes', () => {
    assert.deepEqual(parse('"he said ""hi"""'), [['he said "hi"']]);
  });

  test('newlines inside quotes', () => {
    assert.deepEqual(parse('"a\nb","c\r\nd"', ), [['a\nb', 'c\r\nd']]);
  });

  test('CRLF line endings', () => {
    assert.deepEqual(parse('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]);
  });

  test('trailing newline does not create empty row', () => {
    assert.deepEqual(parse('a,b\n'), [['a', 'b']]);
  });

  test('empty input', () => {
    assert.deepEqual(parse(''), []);
  });

  test('custom delimiter', () => {
    assert.deepEqual(parse('a;b\nc;d', { delimiter: ';' }), [['a', 'b'], ['c', 'd']]);
    assert.deepEqual(parse('"a;b";c', { delimiter: ';' }), [['a;b', 'c']]);
  });

  test('header mode returns objects', () => {
    assert.deepEqual(
      parse('name,age\nAda,36', { header: true }),
      [{ name: 'Ada', age: '36' }],
    );
  });

  test('unclosed quote error includes line number', () => {
    assert.throws(() => parse('a,b\n"x'), /line 2/);
  });

  test('header column-count mismatch error', () => {
    assert.throws(
      () => parse('a,b\n1,2,3', { header: true }),
      (err) => err instanceof Error && /fields/.test(err.message),
    );
  });
});

describe('stringify', () => {
  test('quotes only when needed', () => {
    assert.equal(stringify([['a', 'b'], ['x,y', 'say "hi"']]), 'a,b\n"x,y","say ""hi"""');
  });

  test('quotes CR and LF', () => {
    assert.equal(stringify([['a\r\nb']]), '"a\r\nb"');
  });

  test('no trailing newline', () => {
    const out = stringify([['a'], ['b']]);
    assert.equal(out.endsWith('\n'), false);
  });

  test('null and undefined become empty fields', () => {
    assert.equal(stringify([[null, undefined, 'x']]), ',,x');
  });

  test('objects get a header row in first-seen key order', () => {
    const out = stringify([{ a: 1, b: 2 }, { b: 3, c: 4 }]);
    assert.equal(out, 'a,b,c\n1,2,\n,3,4');
  });

  test('round-trip for arrays of strings', () => {
    const rows = [['a', 'b,c'], ['say "hi"', 'multi\nline'], ['', 'x']];
    assert.deepEqual(parse(stringify(rows)), rows);
  });
});

describe('csv2json CLI', () => {
  const run = (args, input) =>
    spawnSync('node', [BIN, ...args], { input, encoding: 'utf8' });

  test('reads from stdin (arrays)', () => {
    const r = run([], 'a,b\n1,2\n');
    assert.equal(r.status, 0);
    assert.equal(r.stdout, JSON.stringify([['a', 'b'], ['1', '2']], null, 2) + '\n');
  });

  test('--header gives objects', () => {
    const r = run(['--header'], 'name,age\nAda,36\n');
    assert.equal(r.status, 0);
    assert.deepEqual(JSON.parse(r.stdout), [{ name: 'Ada', age: '36' }]);
  });

  test('--delimiter tab', () => {
    const r = run(['--delimiter', 'tab'], 'a\tb\n');
    assert.equal(r.status, 0);
    assert.deepEqual(JSON.parse(r.stdout), [['a', 'b']]);
  });

  test('reads from a temporary file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csv2json-'));
    const file = join(dir, 'in.csv');
    writeFileSync(file, 'x,y\n1,2\n');
    try {
      const r = run([file], '');
      assert.equal(r.status, 0);
      assert.deepEqual(JSON.parse(r.stdout), [['x', 'y'], ['1', '2']]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('bad input exits with code 1 and stderr message', () => {
    const r = run([], 'a\n"unclosed');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /line/);
  });

  test('--help prints usage', () => {
    const r = run(['--help'], '');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Usage:/);
  });
});
