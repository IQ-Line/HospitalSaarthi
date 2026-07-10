import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";

function normalizeUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

const ROUTE_PREFIX = "/api/inventory/v1";

function resolveRoutePattern(request: Parameters<AuthzTargetResolver>[0]): string {
  const route = (request.routeOptions?.url ?? "") as string;
  const raw = route.length > 0 ? normalizeUrl(route) : normalizeUrl(request.url);
  return raw.startsWith(ROUTE_PREFIX) ? raw.slice(ROUTE_PREFIX.length) || "/" : raw;
}

function resolvePathParam(
  request: Parameters<AuthzTargetResolver>[0],
  name: string,
): string | null {
  const params = request.params;
  if (params == null || typeof params !== "object") return null;
  const id = (params as Record<string, unknown>)[name];
  return typeof id === "string" && id.length > 0 ? id : null;
}

function tenantAttr(request: Parameters<AuthzTargetResolver>[0]) {
  return { iq_tenant_id: request.tenantId };
}

type AuthzRequest = Parameters<AuthzTargetResolver>[0];
type AuthzTarget = Awaited<ReturnType<AuthzTargetResolver>>;
type RouteHandler = (request: AuthzRequest) => AuthzTarget;

/**
 * Fixed-id (collection / non-parameterised) route, scoped to the caller's tenant.
 * `id` is a stable label — Cerbos rules key on action + capability, not resource id.
 */
function tenantScoped(kind: string, id: string, action: string): RouteHandler {
  return (request) => ({ kind, id, action, attr: tenantAttr(request) });
}

/**
 * `:param` route whose Cerbos id is the resolved path param, tenant-scoped.
 * Returns null when the named path param is absent (preserves the per-route guard so
 * the PEP fails closed rather than authorising an unidentifiable resource).
 */
function pathIdScoped(kind: string, action: string, paramName: string): RouteHandler {
  return (request) => {
    const id = resolvePathParam(request, paramName);
    if (id === null) return null;
    return { kind, id, action, attr: tenantAttr(request) };
  };
}

/**
 * Exact `${method} ${routePattern}` -> target. HEAD folds into GET before lookup.
 * Patterns are post-prefix (the `/api/inventory/v1` prefix is stripped by resolveRoutePattern).
 *
 * Resource kinds mirror the six inventory sub-domains; capability keys the Cerbos
 * policies gate on are `inventory:<feature>:<action>` (create/read/update). Workflow
 * transitions (submit/approve/reject/cancel/fulfill, GRN line replace + doc upload) are
 * update-class and reuse the resource's `.update` action — no bespoke capability, mirroring
 * the OPD prescription.finalize/cancel convention.
 */
const ROUTE_TABLE: Record<string, RouteHandler> = {
  // --- Items ---------------------------------------------------------------
  "GET /items": tenantScoped("inventory_item", "list", "item.read"),
  "GET /items/next-code": tenantScoped("inventory_item", "next-code", "item.read"),
  "POST /items": tenantScoped("inventory_item", "new", "item.create"),

  // --- Stores --------------------------------------------------------------
  "GET /stores": tenantScoped("inventory_store", "list", "store.read"),
  "GET /stores/:storeId": pathIdScoped("inventory_store", "store.read", "storeId"),
  "POST /stores": tenantScoped("inventory_store", "new", "store.create"),
  "PATCH /stores/:storeId": pathIdScoped("inventory_store", "store.update", "storeId"),

  // --- GRN -----------------------------------------------------------------
  "GET /grns": tenantScoped("inventory_grn", "list", "grn.read"),
  "POST /grns": tenantScoped("inventory_grn", "new", "grn.create"),
  "GET /grns/:grnId": pathIdScoped("inventory_grn", "grn.read", "grnId"),
  "PATCH /grns/:grnId": pathIdScoped("inventory_grn", "grn.update", "grnId"),
  "PUT /grns/:grnId/lines": pathIdScoped("inventory_grn", "grn.update", "grnId"),
  "POST /grns/:grnId/submit": pathIdScoped("inventory_grn", "grn.update", "grnId"),
  "POST /grns/:grnId/documents/:kind": pathIdScoped("inventory_grn", "grn.update", "grnId"),
  "GET /grns/:grnId/documents/:kind": pathIdScoped("inventory_grn", "grn.read", "grnId"),

  // --- Stock ---------------------------------------------------------------
  "GET /stock": tenantScoped("inventory_stock", "list", "stock.read"),
  "GET /stock/:itemId/batches": pathIdScoped("inventory_stock", "stock.read", "itemId"),

  // --- Indents -------------------------------------------------------------
  "GET /indents": tenantScoped("inventory_indent", "list", "indent.read"),
  "GET /indents/stores": tenantScoped("inventory_indent", "stores", "indent.read"),
  "GET /indents/items": tenantScoped("inventory_indent", "items", "indent.read"),
  "GET /indents/active-check": tenantScoped("inventory_indent", "active-check", "indent.read"),
  "POST /indents": tenantScoped("inventory_indent", "new", "indent.create"),
  "GET /indents/by-number/:indentNumber": pathIdScoped(
    "inventory_indent",
    "indent.read",
    "indentNumber",
  ),
  "GET /indents/:indentId": pathIdScoped("inventory_indent", "indent.read", "indentId"),
  "PATCH /indents/:indentId": pathIdScoped("inventory_indent", "indent.update", "indentId"),
  "POST /indents/:indentId/submit": pathIdScoped("inventory_indent", "indent.update", "indentId"),
  "POST /indents/:indentId/approve": pathIdScoped("inventory_indent", "indent.update", "indentId"),
  "POST /indents/:indentId/reject": pathIdScoped("inventory_indent", "indent.update", "indentId"),
  "POST /indents/:indentId/cancel": pathIdScoped("inventory_indent", "indent.update", "indentId"),
  "POST /indents/:indentId/fulfill": pathIdScoped("inventory_indent", "indent.update", "indentId"),

  // --- Transfers -----------------------------------------------------------
  "GET /transfers": tenantScoped("inventory_transfer", "list", "transfer.read"),
  "POST /transfers": tenantScoped("inventory_transfer", "new", "transfer.create"),
  "GET /transfers/:transferId": pathIdScoped("inventory_transfer", "transfer.read", "transferId"),
  // dispatch/receive/cancel are state transitions on an existing transfer. The Cerbos
  // inventory_transfer policy currently grants only transfer.read + transfer.create, so
  // these mutations reuse transfer.create (the sole transfer mutation capability) — the
  // same "all mutations share one capability" shape the indent routes use with indent.update.
  // Finer-grained transfer.dispatch/receive/cancel capabilities can be split out later by
  // adding them to the policy + capability catalog; until then this keeps the routes guarded.
  "POST /transfers/:transferId/dispatch": pathIdScoped(
    "inventory_transfer",
    "transfer.create",
    "transferId",
  ),
  "POST /transfers/:transferId/receive": pathIdScoped(
    "inventory_transfer",
    "transfer.create",
    "transferId",
  ),
  "POST /transfers/:transferId/cancel": pathIdScoped(
    "inventory_transfer",
    "transfer.create",
    "transferId",
  ),
};

export function createInventoryAuthzTargetResolver(): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;
    const handler = ROUTE_TABLE[`${method} ${path}`];
    return handler ? handler(request) : null;
  };
}

/** Exported for the resolver-completeness unit test (every protected route must be listed). */
export const INVENTORY_ROUTE_KEYS = Object.keys(ROUTE_TABLE);
