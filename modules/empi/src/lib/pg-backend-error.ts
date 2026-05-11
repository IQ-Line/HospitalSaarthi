/** PostgreSQL SQLSTATE (e.g. 42P01); avoids matching Node system errors (code: 'ERR_…'). */
function isPostgresSqlState(code: unknown): code is string {
  return typeof code === "string" && /^[0-9]{2}[0-9A-Z]{3}$/.test(code);
}

/**
 * Walk Error.cause chain (DrizzleQueryError → pg DatabaseError) for PostgreSQL fields.
 */
export function readPostgresBackendError(err: unknown): {
  code?: string;
  message: string;
} | undefined {
  const queue: unknown[] = [err];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur == null || seen.has(cur)) continue;
    seen.add(cur);

    if (typeof cur === "object") {
      const o = cur as { code?: unknown; message?: unknown };
      if (isPostgresSqlState(o.code) && typeof o.message === "string") {
        return { code: o.code, message: o.message };
      }

      if ("cause" in cur && cur !== null) {
        queue.push((cur as { cause: unknown }).cause);
      }
      if (cur instanceof AggregateError && Array.isArray(cur.errors)) {
        for (const e of cur.errors) queue.push(e);
      }
    }
  }
  return undefined;
}
