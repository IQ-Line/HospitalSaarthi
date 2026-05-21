/**
 * Normalise a Postgres URL for Node `pg`.
 * - Prefers `ABDM_DATA_DATABASE_URL` when set — ABDM adapter may use a dedicated Postgres
 *   database for adapter-specific data. That override is service-specific and is NOT the
 *   platform convention (operational modules use `DATABASE_URL` → `hims_dev` + one schema each).
 * - Falls back to `DATABASE_URL` (typically `hims_dev`).
 * - Strips SQLAlchemy `postgresql+psycopg://` prefix
 * - Adds `sslmode=require` for Azure Postgres hosts when omitted
 */
export function resolveDatabaseUrl(rawInput?: string): string {
  const raw = (
    rawInput ??
    process.env["ABDM_DATA_DATABASE_URL"] ??
    process.env["DATABASE_URL"] ??
    ""
  ).trim();
  if (!raw) return "";

  let urlString = raw.replace(/^postgresql\+psycopg:\/\//i, "postgresql://");

  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    const isAzure =
      host.endsWith(".postgres.database.azure.com") ||
      host.endsWith(".database.azure.com");
    if (isAzure && !url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
      urlString = url.toString();
    }
  } catch {
    // keep normalised string without URL tweaks
  }

  return urlString;
}
