/**
 * Master-data HTTP base for server-side catalog lookups (departments, etc.).
 * Accepts either service root (`http://localhost:8010`) or full API prefix.
 */
export function resolveMasterDataApiBase(): string | undefined {
  const raw =
    process.env["MASTER_DATA_BASE_URL"]?.trim() ||
    process.env["MASTER_DATA_URL"]?.trim();
  if (!raw) return undefined;

  const base = raw.replace(/\/$/, "");
  if (/\/api\/v1\/master-data$/i.test(base)) return base;
  if (/\/api\/v1$/i.test(base)) return `${base}/master-data`;
  return `${base}/api/v1/master-data`;
}
