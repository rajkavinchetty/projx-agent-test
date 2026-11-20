# projx-agent-test

A tiny project used to test the ProjX AI agent end to end. Safe to delete.

```sh
npm test
```

## CSV

Library (`src/csv.js`):

```js
import { parse, stringify } from "./src/csv.js";

parse("name,age\nAda,36\n", { header: true });
// => [{ name: "Ada", age: "36" }]

parse('"a,b","say ""hi"""', { delimiter: "," });
// => [["a,b", 'say "hi"']]

stringify([["a", "b,c"], ["x", null]]);
// => 'a,"b,c"\nx,'
```

Both `\n` and `\r\n` line endings are accepted, quoted fields may contain
commas, newlines and escaped quotes (RFC 4180), and a trailing newline does
not create an empty row. `stringify` quotes a field only when needed and
accepts arrays of arrays or arrays of objects (missing values become empty).

CLI (`bin/csv2json.js`, no dependencies):

```sh
node bin/csv2json.js data.csv --header          # objects keyed by header row
cat data.csv | node bin/csv2json.js             # read from stdin
node bin/csv2json.js data.tsv --delimiter tab   # tab-delimited input
```
