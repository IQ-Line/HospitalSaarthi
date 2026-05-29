/** Structured adapter logs (stdout) — no Fastify logger in use-cases. */
export function abdmWarn(
  event: string,
  fields: Record<string, string | number | boolean | undefined>,
): void {
  const payload = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined),
  );
  console.warn(JSON.stringify({ level: "warn", event, ...payload }));
}
