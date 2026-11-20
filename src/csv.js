/** Parse RFC 4180 CSV text into rows of strings, or objects when header is true. */
export function parse(text, { header = false, delimiter = "," } = {}) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  let i = 0;
  let line = 1;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        if (ch === "\n") line += 1;
        field += ch;
        i += 1;
      }
      continue;
    }

    if (ch === '"' && field === "") {
      inQuotes = true;
      i += 1;
    } else if (ch === delimiter) {
      pushField();
      i += 1;
    } else if (ch === "\r" && text[i + 1] === "\n") {
      pushRow();
      i += 2;
      line += 1;
    } else if (ch === "\n" || ch === "\r") {
      pushRow();
      i += 1;
      line += 1;
    } else {
      field += ch;
      i += 1;
    }
  }

  if (inQuotes) {
    throw new Error(`Quoted field never closed on line ${line}`);
  }
  // Final row: only if there is content (a trailing newline must not add a row).
  if (field !== "" || row.length > 0) pushRow();

  if (header) {
    if (rows.length === 0) return [];
    const names = rows[0];
    return rows.slice(1).map((r, idx) => {
      if (r.length !== names.length) {
        throw new Error(
          `Row ${idx + 2} has ${r.length} fields, expected ${names.length}`
        );
      }
      const obj = {};
      names.forEach((name, c) => {
        obj[name] = r[c];
      });
      return obj;
    });
  }
  return rows;
}

/** Stringify rows (arrays or objects) to CSV text, joined with \n and no trailing newline. */
export function stringify(rows, { delimiter = "," } = {}) {
  if (!Array.isArray(rows)) throw new TypeError("stringify expects an array of rows");
  const cols = [];
  const objects = rows.length > 0 && rows.every((r) => r !== null && typeof r === "object" && !Array.isArray(r));
  if (objects) {
    for (const r of rows) {
      for (const k of Object.keys(r)) {
        if (!cols.includes(k)) cols.push(k);
      }
    }
  }
  const quoteField = (value) => {
    if (value === null || value === undefined) value = "";
    const s = String(value);
    if (s.includes(delimiter) || s.includes('"') || s.includes("\r") || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const lines = [];
  if (objects) {
    lines.push(cols.map(quoteField).join(delimiter));
    for (const r of rows) {
      lines.push(cols.map((c) => quoteField(r[c])).join(delimiter));
    }
  } else {
    for (const r of rows) {
      lines.push([...r].map(quoteField).join(delimiter));
    }
  }
  return lines.join("\n");
}
