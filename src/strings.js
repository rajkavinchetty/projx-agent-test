/** Capitalise the first letter of every word. */
export function titleCase(text) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Convert text to a URL-friendly slug. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Shorten text to at most `max` characters, ending with "…" when cut. */
export function truncate(text, max) {
  const s = String(text);
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…';
}
