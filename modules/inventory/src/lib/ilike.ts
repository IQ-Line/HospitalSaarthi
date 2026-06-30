/** Escape `%`, `_`, and `\` for use with `ILIKE … ESCAPE '\'` patterns. */
export function escapeIlikePattern(raw: string): string {
  return raw.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export function toIlikeContainsPattern(search: string): string {
  return `%${escapeIlikePattern(search.trim())}%`;
}
