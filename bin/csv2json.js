#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parse } from "../src/csv.js";

const usage = `Usage: csv2json [file] [options]

Reads CSV from a file path argument, or from stdin when no path is given,
and prints JSON to stdout.

Options:
  --header           Treat the first row as a header; output objects.
  --delimiter <char> Field delimiter (default ","). Use "tab" for \\t.
  --help             Show this help.`;

const args = process.argv.slice(2);
let file = null;
let header = false;
let delimiter = ",";

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--help" || a === "-h") {
    console.log(usage);
    process.exit(0);
  } else if (a === "--header") {
    header = true;
  } else if (a === "--delimiter") {
    const next = args[++i];
    if (next === undefined) {
      console.error("Missing value for --delimiter");
      process.exit(1);
    }
    delimiter = next === "tab" ? "\t" : next;
  } else if (a.startsWith("--delimiter=")) {
    const next = a.slice("--delimiter=".length);
    delimiter = next === "tab" ? "\t" : next;
  } else if (!a.startsWith("-")) {
    file = a;
  } else {
    console.error(`Unknown option: ${a}`);
    process.exit(1);
  }
}

try {
  const text = file
    ? readFileSync(file, "utf8")
    : readFileSync(0, "utf8");
  const result = parse(text, { header, delimiter });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
