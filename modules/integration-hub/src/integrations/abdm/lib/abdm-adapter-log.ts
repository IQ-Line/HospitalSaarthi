/** A single structured-log field value (JSON-serialized as-is; `undefined` is dropped). */
export type AbdmLogValue = string | number | boolean | null | undefined | readonly string[];

/** Structured adapter logs (stdout) — no Fastify logger in use-cases. */
export function abdmWarn(
  event: string,
  fields: Record<string, AbdmLogValue>,
): void {
  const payload = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined),
  );
  console.warn(JSON.stringify({ level: "warn", event, ...payload }));
}
