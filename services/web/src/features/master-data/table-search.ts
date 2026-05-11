/**
 * Client-side table search. Master Data list APIs do not expose a `search` query param
 * in OpenAPI (only category / action / is_template / module_id filters), so we filter
 * loaded rows in the browser.
 */
export function rowMatchesSearch(
  query: string,
  ...fields: Array<string | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? '').toLowerCase().includes(q));
}
