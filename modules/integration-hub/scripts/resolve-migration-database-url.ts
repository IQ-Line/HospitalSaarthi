/**
 * Postgres URL for integration_hub migrations.
 * Prefers INTEGRATION_HUB_DATABASE_URL, then legacy ABDM_DATA_DATABASE_URL, then DATABASE_URL.
 */
export function resolveMigrationDatabaseUrl(): string {
  const raw = (
    process.env["INTEGRATION_HUB_DATABASE_URL"] ??
    process.env["ABDM_DATA_DATABASE_URL"] ??
    process.env["DATABASE_URL"] ??
    ""
  ).trim();
  if (!raw) {
    throw new Error(
      "Set INTEGRATION_HUB_DATABASE_URL, ABDM_DATA_DATABASE_URL, or DATABASE_URL",
    );
  }

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
