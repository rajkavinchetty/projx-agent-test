import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "../src/csv.js";

const cliPath = fileURLToPath(new URL("../bin/csv2json.js", import.meta.url));

test("parse: quoted fields with commas", () => {
  assert.deepEqual(parse('a,"b,c",d'), [["a", "b,c", "d"]]);
});

test("parse: escaped quotes", () => {
  assert.deepEqual(parse('"say ""hi"""'), [['say "hi"']]);
});

test("parse: newlines inside quotes", () => {
  assert.deepEqual(parse('"line1\nline2",x'), [["line1\nline2", "x"]]);
});

test("parse: CRLF input", () => {
  assert.deepEqual(parse("a,b\r\nc,d\r\n"), [["a", "b"], ["c", "d"]]);
});

test("parse: trailing newline does not create empty row", () => {
  assert.deepEqual(parse("a,b\n"), [["a", "b"]]);
});

test("parse: empty input returns []", () => {
  assert.deepEqual(parse(""), []);
});

test("parse: header mode", () => {
  const rows = parse("name,age\nAda,36\n", { header: true });
  assert.deepEqual(rows, [{ name: "Ada", age: "36" }]);
});

test("parse: unclosed quote error includes line number", () => {
  assert.throws(() => parse("a,b\n\"oops"), /line 2/);
});

test("parse: column-count mismatch with header", () => {
  assert.throws(
    () => parse("a,b\n1", { header: true }),
    /Row 2 has 1 fields, expected 2/,
  );
});

test("parse: custom delimiter", () => {
  assert.deepEqual(parse("a;b\n;c", { delimiter: ";" }), [
    ["a", "b"],
    ["", "c"],
  ]);
});

test("stringify: quoting rules", () => {
  assert.equal(stringify([["a", "b,c", 'x"y', "n\nl", "plain"]]),
    'a,"b,c","x""y","n\nl",plain');
  assert.equal(stringify([["a", "b,c"]], { delimiter: ";" }), "a;b,c");
});

test("stringify: null and undefined become empty fields", () => {
  assert.equal(stringify([["a", null, undefined, "d"]]), "a,,,d");
});

test("stringify: objects with differing keys", () => {
  assert.equal(
    stringify([{ a: "1", b: "2" }, { a: "3", c: "4" }]),
    'a,b,c\n1,2,\n3,,4',
  );
});

test("round-trip: parse(stringify(x)) for arrays of strings", () => {
  const rows = [
    ["plain", "with,comma", 'with"quote', "with\nnewline", "", "crlf\r\nthing"],
    ["1", "2", "3", "4", "5", "6"],
  ];
  assert.deepEqual(parse(stringify(rows)), rows);
});

// --- CLI ---

test("CLI: reads CSV from stdin", () => {
  const res = spawnSync("node", [cliPath], {
    input: "a,b\n1,2\n",
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.deepEqual(JSON.parse(res.stdout), [["a", "b"], ["1", "2"]]);
});

test("CLI: --header outputs objects", () => {
  const res = spawnSync("node", [cliPath, "--header"], {
    input: "a,b\n1,2\n",
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.deepEqual(JSON.parse(res.stdout), [{ a: "1", b: "2" }]);
});

test("CLI: --delimiter tab", () => {
  const res = spawnSync("node", [cliPath, "--delimiter", "tab", "--header"], {
    input: "a\tb\n1\t2\n",
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.deepEqual(JSON.parse(res.stdout), [{ a: "1", b: "2" }]);
});

test("CLI: reads from a temporary file", () => {
  const dir = mkdtempSync(join(tmpdir(), "csv2json-"));
  const file = join(dir, "input.csv");
  writeFileSync(file, "x,y\n3,4\n");
  const out = execFileSync("node", [cliPath, file], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(out), [["x", "y"], ["3", "4"]]);
});

test("CLI: exit code 1 and stderr message on bad input", () => {
  const res = spawnSync("node", [cliPath], {
    input: 'a,b\n"unclosed',
    encoding: "utf8",
  });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Unclosed quoted field/);
});

test("CLI: --help prints usage", () => {
  const res = spawnSync("node", [cliPath, "--help"], { encoding: "utf8" });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage: csv2json/);
});
