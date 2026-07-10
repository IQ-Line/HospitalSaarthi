import type { FastifyRequest } from "fastify";

/**
 * onRequest hook: derive the request tenant strictly from the **verified principal**
 * (`request.user.tenantId`, mapped from the JWT `iq_tenant_id` claim), overriding any
 * client-supplied `iq_tenant_id` / `x-tenant-id` header.
 *
 * The absorbed inventory-svc trusted the client tenant header outright (and injected a
 * hardcoded dev-tenant UUID when it was absent). That let any caller read/write another
 * tenant's stock by spoofing a header. Deriving the tenant from the verified principal
 * closes that hole: a foreign tenant header is silently ignored for authenticated requests.
 *
 * Where tenant isolation is actually enforced: the repository layer scopes every query with a
 * `WHERE iq_tenant_id = <derived tenant>` filter (see modules/inventory/src/data-access/*.repo.ts),
 * so a caller can only ever touch rows in their own tenant. The Cerbos policies also carry an
 * `iq_tenant_id`-equality rule, but with the CURRENT resolvers it does not add runtime
 * defence-in-depth: the target resolver attaches `request.tenantId` (this same derived principal
 * tenant) as `resource.attr.iq_tenant_id`, so the policy compares the principal's tenant against
 * itself (X == X) and can never deny on tenant. That equality only becomes a live second line of
 * defence if a resolver is ever changed to attach a resource-LOADED tenant (e.g. the tenant read
 * from the persisted row) instead of the request tenant. Until then, treat repository scoping as
 * the tenant-isolation control; the policy tenant-eq is exercised in isolation by the cerbos suite.
 *
 * Register this AFTER `identityPlugin` (so `request.user` is populated) and BEFORE
 * `tenantPlugin` (so the header it sets becomes the value tenantPlugin derives `tenantId`
 * from — this also avoids tenantPlugin's missing-tenant 400 on a header-less authed request).
 * When there is no verified principal (e.g. an unauthenticated dev/Swagger call on a public
 * route) it is a no-op and the standard `tenantPlugin` header handling applies — no hardcoded
 * fallback, so a header-less unauthenticated call fails closed rather than assuming a tenant.
 */
export async function enforcePrincipalTenant(request: FastifyRequest): Promise<void> {
  const principalTenant = (request as { user?: { tenantId?: string } }).user?.tenantId;
  if (typeof principalTenant === "string" && principalTenant.length > 0) {
    request.tenantId = principalTenant;
    request.headers["iq_tenant_id"] = principalTenant;
    request.headers["x-tenant-id"] = principalTenant;
  }
}
