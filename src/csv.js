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
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
    fieldWasQuoted = false;
    started = false;
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  if (text === '' || text == null) return header ? [] : [];

  while (i < text.length) {
    const ch = text[i];
    if (ch === '\n') line++;
    else if (ch === '\r' && text[i + 1] === '\n') { /* counted at \n */ }

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && !started) {
      inQuotes = true;
      fieldWasQuoted = true;
      started = true;
      i++;
      continue;
    }
    if (ch === delimiter) { pushField(); i++; continue; }
    if (ch === '\r' || ch === '\n') {
      // Handle CRLF as one terminator.
      if (ch === '\r' && text[i + 1] === '\n') i++;
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
    throw new Error(`Unclosed quoted field on line ${line}`);
  }
  // Flush the last field/row unless the input ended with a row terminator.
  if (field !== '' || row.length > 0 || started || fieldWasQuoted) {
    pushRow();
  }

  if (header) {
    if (rows.length === 0) return [];
    const head = rows[0];
    return rows.slice(1).map((r, idx) => {
      if (r.length !== head.length) {
        // Line number: 1-based, header is line 1.
        throw new Error(
          `Row ${idx + 2} on line ${idx + 2} has ${r.length} fields, expected ${head.length}`,
        );
      }
      const obj = {};
      head.forEach((name, j) => { obj[name] = r[j]; });
      return obj;
    });
  }
  return rows;
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
      return headerKeys.map((k) => (k in row ? row[k] : ''));
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

  return outRows.map((row) => row.map(esc).join(delimiter)).join('\n');
}
