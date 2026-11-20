#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";
import { parse } from "../src/csv.js";

const usage = `Usage: csv2json [file] [--header] [--delimiter <char>]

Reads CSV from a file, or from stdin when no file is given,
and prints JSON to stdout (2-space indent).

Options:
  --header             Treat the first row as a header; output objects
  --delimiter <char>   Field delimiter ("," by default; "tab" also accepted)
  --help               Show this help message
`;

const args = process.argv.slice(2);
let header = false;
let delimiter = ",";
let path = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--help") {
    console.log(usage);
    process.exit(0);
  } else if (arg === "--header") {
    header = true;
  } else if (arg === "--delimiter") {
    const value = args[++i];
    if (value === undefined) {
      console.error("Missing value for --delimiter");
      process.exit(1);
    }
    delimiter = value === "tab" ? "\t" : value;
  } else if (arg.startsWith("--")) {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  } else {
    path = arg;
  }
}

let input;
try {
  if (path === null || path === "-") {
    input = readFileSync(0, "utf8");
  } else {
    statSync(path); // throws if missing, before we try to read it
    input = readFileSync(path, "utf8");
  }
} catch (err) {
  console.error(`csv2json: ${err.message}`);
  process.exit(1);
}

let data;
try {
  data = parse(input, { header, delimiter });
} catch (err) {
  console.error(`csv2json: ${err.message}`);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
