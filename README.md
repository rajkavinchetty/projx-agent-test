# projx-agent-test

A tiny project used to test the ProjX AI agent end to end. Safe to delete.

```sh
npm test
```

## CSV

Library (`src/csv.js`, no dependencies, RFC 4180):

```js
import { parse, stringify } from './src/csv.js';

parse('a,"b,c"\nd,e');            // [['a', 'b,c'], ['d', 'e']]
parse('name,age\nAda,36', { header: true }); // [{ name: 'Ada', age: '36' }]
parse('a;b', { delimiter: ';' }); // [['a', 'b']]

stringify([['a', 'b,c'], ['say "hi"', 'x']]); // 'a,"b,c"\n"say ""hi""",x'
stringify([{ a: 1, b: 2 }]);                  // 'a,b\n1,2'
```

`parse` accepts both `\n` and `\r\n` line endings and ignores a trailing
newline. It throws an `Error` (including the line number) for unclosed quoted
fields or, in header mode, rows with a different column count than the header.
`stringify` quotes a field only when needed and has no trailing newline. It
round-trips with `parse` for arrays of strings; note that a row whose only
field is empty is serialised as `""` (a bare empty field would be
indistinguishable from empty input or a trailing newline).

CLI (`bin/csv2json.js`):

```sh
node bin/csv2json.js data.csv                       # arrays
node bin/csv2json.js --header data.csv              # objects keyed by header
cat data.csv | node bin/csv2json.js --header        # stdin input
node bin/csv2json.js --delimiter tab data.tsv       # tab-separated
node bin/csv2json.js --delimiter ";" data.csv       # semicolon-separated
```

On a parse error the message is written to stderr and the process exits with
code 1. `--help` prints usage. `--version` (or `-v`) prints the package
version and exits 0.

