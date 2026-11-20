#!/usr/bin/env node
/** csv2json: convert CSV to JSON. Reads a file argument or stdin. */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { parse } from '../src/csv.js';

const usage = `Usage: node bin/csv2json.js [--header] [--delimiter <char>] [file]

Convert CSV to JSON. Reads from <file>, or stdin when no file is given.

Options:
  --header            Treat the first row as a header; output objects.
  --delimiter <char>  Field delimiter (default ","). Use "tab" for tabs.
  --help              Show this help.`;

function argValue(argv, i, flag) {
  const v = argv[i + 1];
  if (!v) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return v;
}

function main() {
  const argv = process.argv.slice(2);
  let header = false;
  let delimiter = ',';
  let file = null;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      console.log(usage);
      return;
    }
    if (a === '--header') header = true;
    else if (a === '--delimiter' || a === '-d') delimiter = argValue(argv, i++, a);
    else if (a === '--') file = argv[i + 1] ?? null;
    else if (a.startsWith('--')) {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    } else file = a;
  }

  if (delimiter === 'tab') delimiter = '\t';
  if (delimiter.length !== 1) {
    console.error('Delimiter must be a single character (or "tab")');
    process.exit(2);
  }

  let text;
  try {
    if (file) {
      if (!existsSync(file) || statSync(file).isDirectory()) {
        console.error(`Cannot read file: ${file}`);
        process.exit(1);
      }
      text = readFileSync(file, 'utf8');
    } else {
      text = readFileSync(0, 'utf8');
    }
  } catch (err) {
    console.error(`Cannot read input: ${err.message}`);
    process.exit(1);
  }

  try {
    const result = parse(text, { header, delimiter });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
