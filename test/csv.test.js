import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse, stringify } from "../src/csv.js";

test("parse: simple rows", () => {
  assert.deepEqual(parse("a,b\nc,d"), [["a", "b"], ["c", "d"]]);
});

test("parse: quoted field containing comma", () => {
  assert.deepEqual(parse('"a,b",c'), [["a,b", "c"]]);
});

test("parse: escaped quotes inside quoted field", () => {
  assert.deepEqual(parse('"say ""hi""",x'), [['say "hi"', "x"]]);
});

test("parse: newline inside quoted field", () => {
  assert.deepEqual(parse('"line1\nline2",b'), [["line1\nline2", "b"]]);
  assert.deepEqual(parse('"line1\r\nline2",b'), [["line1\r\nline2", "b"]]);
});

test("parse: CRLF line endings", () => {
  assert.deepEqual(parse("a,b\r\nc,d\r\n"), [["a", "b"], ["c", "d"]]);
});

test("parse: trailing newline does not create an empty row", () => {
  assert.deepEqual(parse("a,b\n"), [["a", "b"]]);
});

test("parse: empty input returns []", () => {
  assert.deepEqual(parse(""), []);
});

test("parse: header mode returns objects", () => {
  const rows = parse("name,age\nAda,36\nLin,30\n", { header: true });
  assert.deepEqual(rows, [
    { name: "Ada", age: "36" },
    { name: "Lin", age: "30" },
  ]);
});

test("parse: unclosed quote throws with line number", () => {
  assert.throws(() => parse("a,b\n\"unclosed"), /line 2/);
});

test("parse: header column-count mismatch throws", () => {
  assert.throws(
    () => parse("a,b,c\n1,2\n", { header: true }),
    /expected 3/
  );
});

test("parse: custom delimiter", () => {
  assert.deepEqual(parse("a;b\nc;d", { delimiter: ";" }), [["a", "b"], ["c", "d"]]);
});

test("stringify: quotes only when needed", () => {
  assert.equal(stringify([["plain", "with,comma"], ['has "quote"', "has\nnewline"]]),
    'plain,"with,comma"\n"has ""quote""","has\nnewline"');
});

test("stringify: CR is quoted", () => {
  assert.equal(stringify([["a\r", "b"]]), '"a\r",b');
});

test("stringify: null and undefined become empty fields", () => {
  assert.equal(stringify([[null, undefined, "x"]]), ",,x");
});

test("stringify: no trailing newline", () => {
  const out = stringify([["a"], ["b"]]);
  assert.equal(out, "a\nb");
  assert.ok(!out.endsWith("\n"));
});

test("stringify: objects with differing keys, union in first-seen order", () => {
  const out = stringify([
    { a: "1", b: "2" },
    { b: "3", c: "4" },
  ]);
  assert.equal(out, 'a,b,c\n1,2,\n,3,4');
});

test("round-trip: parse(stringify(x)) === x", () => {
  const rows = [["a", "b,c"], ['say "hi"', "multi\nline"], ["", "x"]];
  assert.deepEqual(parse(stringify(rows)), rows);
});

// ---- CLI tests ----

const CLI = path.resolve("bin/csv2json.js");

test("CLI: reads from stdin", () => {
  const r = spawnSync("node", [CLI, "--header"], { input: "name,age\nAda,36\n" });
  assert.equal(r.status, 0);
  assert.deepEqual(JSON.parse(r.stdout.toString()), [{ name: "Ada", age: "36" }]);
});

test("CLI: reads a file and honours --delimiter tab", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "csv2json-"));
  try {
    const file = path.join(dir, "data.csv");
    writeFileSync(file, "a\tb\n1\t2\n");
    const out = execFileSync("node", [CLI, file, "--delimiter", "tab"]);
    assert.deepEqual(JSON.parse(out.toString()), [["a", "b"], ["1", "2"]]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: --help prints usage", () => {
  const r = spawnSync("node", [CLI, "--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout.toString(), /Usage: csv2json/);
});

test("CLI: bad input exits 1 with stderr message", () => {
  const r = spawnSync("node", [CLI], { input: '"unclosed,hi' });
  assert.equal(r.status, 1);
  assert.match(r.stderr.toString(), /line 1/);
});
