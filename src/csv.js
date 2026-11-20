/** RFC 4180 CSV parsing and serialising. No dependencies. */

/**
 * Parse CSV text into rows of strings, or (with `header: true`) into objects
 * keyed by the first row.
 *
 * @param {string} text
 * @param {{ header?: boolean, delimiter?: string }} [options]
 * @returns {string[][] | Record<string, string>[]}
 */
export function parse(text, { header = false, delimiter = ',' } = {}) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let fieldWasQuoted = false;
  let started = false; // any char consumed for the current field
  let line = 1;
  let quoteStartLine = 1;
  let rowStartLine = 1;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
    fieldWasQuoted = false;
    started = false;
  };
  const pushRow = () => {
    pushField();
    rows.push({ startLine: rowStartLine, fields: row });
    row = [];
    rowStartLine = line;
  };

  if (text == null || text === '') return [];
  // Strip a leading UTF-8 BOM, which Excel/Windows tools often add.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
        i++;
        continue;
      }
      // Count newlines inside quoted fields (CRLF counts as one line).
      if (ch === '\n' || (ch === '\r' && text[i + 1] !== '\n')) line++;
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && !started) {
      inQuotes = true;
      quoteStartLine = line;
      fieldWasQuoted = true;
      started = true;
      i++;
      continue;
    }
    if (ch === delimiter) { pushField(); i++; continue; }
    if (ch === '\r' || ch === '\n') {
      // Treat CRLF as one row terminator (and one line); a lone \r also
      // terminates a row and counts as a line.
      if (ch === '\r' && text[i + 1] === '\n') i++;
      line++;
      pushRow();
      i++;
      // A trailing newline must not create an empty row.
      if (i >= text.length) break;
      continue;
    }
    field += ch;
    started = true;
    i++;
  }

  if (inQuotes) {
    throw new Error(
      `Unclosed quoted field: quote opened on line ${quoteStartLine} is not closed before end of input (line ${line})`,
    );
  }
  // Flush the last field/row unless the input ended with a row terminator.
  if (field !== '' || row.length > 0 || started || fieldWasQuoted) {
    pushRow();
  }

  if (header) {
    if (rows.length === 0) return [];
    const head = rows[0].fields;
    return rows.slice(1).map(({ startLine, fields: r }) => {
      if (r.length !== head.length) {
        // Line number: 1-based physical line where the row starts.
        throw new Error(
          `Row on line ${startLine} has ${r.length} fields, expected ${head.length}`,
        );
      }
      // Define explicitly so header names like "__proto__" are representable.
      const obj = {};
      head.forEach((name, j) => {
        Object.defineProperty(obj, name, {
          value: r[j], enumerable: true, writable: true, configurable: true,
        });
      });
      return obj;
    });
  }
  return rows.map((r) => r.fields);
}

/**
 * Serialise rows to CSV. Accepts arrays of arrays or arrays of objects.
 *
 * @param {Array<Array<unknown> | Record<string, unknown>>} rows
 * @param {{ delimiter?: string }} [options]
 * @returns {string}
 */
export function stringify(rows, { delimiter = ',' } = {}) {
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
  if (rows.length === 0) return '';

  let headerKeys = null;
  const outRows = rows.map((row) => {
    if (Array.isArray(row)) return row;
    if (row && typeof row === 'object') {
      if (!headerKeys) {
        const seen = [];
        for (const r of rows) {
          if (r && typeof r === 'object' && !Array.isArray(r)) {
            for (const k of Object.keys(r)) if (!seen.includes(k)) seen.push(k);
          }
        }
        headerKeys = seen;
      }
      return headerKeys.map((k) => (Object.hasOwn(row, k) ? row[k] : ''));
    }
    return [row];
  });
  if (headerKeys) outRows.unshift(headerKeys);

  const quoteChar = '"';
  const esc = (value) => {
    if (value === null || value === undefined) return '';
    let s = String(value);
    if (s.includes(quoteChar)) s = s.replaceAll(quoteChar, '""');
    if (s.includes(delimiter) || s.includes('"') || s.includes('\r') || s.includes('\n')) {
      s = `"${s}"`;
    }
    return s;
  };

  // Join rows. A row with no fields, or whose only field is empty, is
  // serialised as `""` so that `parse(stringify(x))` round-trips: a bare ''
  // would be indistinguishable from empty input (which parses to []) or from
  // a trailing newline.
  return outRows
    .map((row) => {
      if (row.length === 0 || (row.length === 1 && esc(row[0]) === '')) return '""';
      return row.map(esc).join(delimiter);
    })
    .join('\n');
}
