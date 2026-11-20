# projx-agent-test

A tiny project used to test the ProjX AI agent end to end. Safe to delete.

```sh
npm test
```

## CSV

### Library

`src/csv.js` exports `parse` and `stringify`, following RFC 4180.

```js
import { parse, stringify } from './src/csv.js';

parse('name,age\nAda,36\n', { header: true });
// => [{ name: 'Ada', age: '36' }]

parse('a,"b,c"\n', { delimiter: ',' });
// => [['a', 'b,c']]

stringify([['a', 'b,c', 'say "hi"']]);
// => 'a,"b,c","say ""hi"""'

stringify([{ x: 1, y: 2 }, { x: 3 }]);
// => 'x,y\n1,2\n3,'
```

Options:

- `parse(text, { header = false, delimiter = "," })` — with `header: true`,
  returns objects keyed by the first row. Unclosed quotes or column-count
  mismatches (header mode) throw an `Error` including the line number.
- `stringify(rows, { delimiter = "," })` — accepts arrays or objects; fields
  are quoted only when needed; `null`/`undefined` become empty fields.

### CLI

```sh
node bin/csv2json.js data.csv                 # from a file
cat data.csv | node bin/csv2json.js --header  # from stdin, as objects
node bin/csv2json.js --delimiter tab data.tsv # tab-delimited
node bin/csv2json.js --help
```

Output is JSON (2-space indent). Parse errors are printed to stderr and the
process exits with code 1.
