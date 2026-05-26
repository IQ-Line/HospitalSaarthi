export { buildTenantCerbosScopeKey } from "@hims/ts-sdk-tenant";

export function branchTenantSlug(orgSlug: string, branchCode: string): string {
  const normalized = branchCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeOrg = orgSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safeOrg}-${normalized.toLowerCase()}`;
}
