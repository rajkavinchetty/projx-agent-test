/**
 * Minimal RFC 4180 CSV parser and writer.
 */

/** Parse CSV text into rows of strings, or objects when header is true. */
export function parse(text, { header = false, delimiter = "," } = {}) {
  if (text === "" || text == null) return [];

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let fieldStartedOnLine = 1;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  const d = String(delimiter);

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
      fieldStartedOnLine = line;
      i += 1;
      continue;
    }

    if (ch === d) {
      pushField();
      i += 1;
      continue;
    }

    if (ch === "\n") {
      pushRow();
      line += 1;
      i += 1;
      continue;
    }

    if (ch === "\r" && text[i + 1] === "\n") {
      pushRow();
      line += 1;
      i += 2;
      continue;
    }

    field += ch;
    i += 1;
  }

  if (inQuotes) {
    throw new Error(
      `Unclosed quoted field starting on line ${fieldStartedOnLine}`,
    );
  }

  // Final field/row if there is content on the last line.
  if (field !== "" || row.length > 0) {
    pushRow();
  }

  if (!header) return rows;

  if (rows.length === 0) return [];
  const head = rows[0];
  return rows.slice(1).map((r, idx) => {
    if (r.length !== head.length) {
      throw new Error(
        `Row ${idx + 2} has ${r.length} fields, expected ${head.length}`,
      );
    }
    const obj = {};
    head.forEach((name, j) => {
      obj[name] = r[j];
    });
    return obj;
  });
}

/** Quote a field only when necessary. */
function escapeField(value, delimiter) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const needsQuoting =
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r");
  if (!needsQuoting) return str;
  return '"' + str.replace(/"/g, '""') + '"';
}

/** Serialize rows (arrays or objects) to CSV text. */
export function stringify(rows, { delimiter = "," } = {}) {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  const d = String(delimiter);

  const isObjects = rows.length > 0 && rows.every((r) => r !== null && typeof r === "object" && !Array.isArray(r));
  let lines;

  if (isObjects) {
    const keys = [];
    for (const obj of rows) {
      for (const k of Object.keys(obj)) {
        if (!keys.includes(k)) keys.push(k);
      }
    }
    lines = [
      keys.map((k) => escapeField(k, d)).join(d),
      ...rows.map((obj) =>
        keys.map((k) => escapeField(obj[k], d)).join(d),
      ),
    ];
  } else {
    lines = rows.map((row) =>
      Array.isArray(row)
        ? row.map((v) => escapeField(v, d)).join(d)
        : escapeField(row, d),
    );
  }

  return lines.join("\n");
}
