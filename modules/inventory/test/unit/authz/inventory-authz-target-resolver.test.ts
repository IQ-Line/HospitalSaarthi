import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";
import {
  createInventoryAuthzTargetResolver,
  INVENTORY_ROUTE_KEYS,
} from "../../../src/authz/inventory-authz-target-resolver.js";
import { createRouter } from "../../../src/router.js";

const PREFIX = "/api/inventory/v1";
const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PROBE_UUID = "00000000-0000-0000-0000-000000000000";

/** Build a synthetic request the resolver understands (routeOptions.url + params + tenantId). */
function req(method: string, routePattern: string, params: Record<string, string> = {}) {
  return {
    method,
    url: `${PREFIX}${routePattern}`,
    routeOptions: { url: `${PREFIX}${routePattern}` },
    params,
    tenantId: TENANT,
  } as unknown as Parameters<AuthzTargetResolver>[0];
}

describe("createInventoryAuthzTargetResolver — explicit mappings (every route)", () => {
  const resolver = createInventoryAuthzTargetResolver();

  // method, routePattern, params, expected kind, expected id, expected action
  const cases: Array<[string, string, Record<string, string>, string, string, string]> = [
    // Items
    ["GET", "/items", {}, "inventory_item", "list", "item.read"],
    ["GET", "/items/next-code", {}, "inventory_item", "next-code", "item.read"],
    ["POST", "/items", {}, "inventory_item", "new", "item.create"],
    // Stores
    ["GET", "/stores", {}, "inventory_store", "list", "store.read"],
    ["GET", "/stores/:storeId", { storeId: "s-1" }, "inventory_store", "s-1", "store.read"],
    ["POST", "/stores", {}, "inventory_store", "new", "store.create"],
    ["PATCH", "/stores/:storeId", { storeId: "s-1" }, "inventory_store", "s-1", "store.update"],
    // GRN
    ["GET", "/grns", {}, "inventory_grn", "list", "grn.read"],
    ["POST", "/grns", {}, "inventory_grn", "new", "grn.create"],
    ["GET", "/grns/:grnId", { grnId: "g-1" }, "inventory_grn", "g-1", "grn.read"],
    ["PATCH", "/grns/:grnId", { grnId: "g-1" }, "inventory_grn", "g-1", "grn.update"],
    ["PUT", "/grns/:grnId/lines", { grnId: "g-1" }, "inventory_grn", "g-1", "grn.update"],
    ["POST", "/grns/:grnId/submit", { grnId: "g-1" }, "inventory_grn", "g-1", "grn.update"],
    [
      "POST",
      "/grns/:grnId/documents/:kind",
      { grnId: "g-1", kind: "invoice" },
      "inventory_grn",
      "g-1",
      "grn.update",
    ],
    [
      "GET",
      "/grns/:grnId/documents/:kind",
      { grnId: "g-1", kind: "invoice" },
      "inventory_grn",
      "g-1",
      "grn.read",
    ],
    // Stock
    ["GET", "/stock", {}, "inventory_stock", "list", "stock.read"],
    ["GET", "/stock/:itemId/batches", { itemId: "i-1" }, "inventory_stock", "i-1", "stock.read"],
    // Indents
    ["GET", "/indents", {}, "inventory_indent", "list", "indent.read"],
    ["GET", "/indents/stores", {}, "inventory_indent", "stores", "indent.read"],
    ["GET", "/indents/items", {}, "inventory_indent", "items", "indent.read"],
    ["GET", "/indents/active-check", {}, "inventory_indent", "active-check", "indent.read"],
    ["POST", "/indents", {}, "inventory_indent", "new", "indent.create"],
    ["GET", "/indents/:indentId", { indentId: "d-1" }, "inventory_indent", "d-1", "indent.read"],
    [
      "PATCH",
      "/indents/:indentId",
      { indentId: "d-1" },
      "inventory_indent",
      "d-1",
      "indent.update",
    ],
    [
      "POST",
      "/indents/:indentId/submit",
      { indentId: "d-1" },
      "inventory_indent",
      "d-1",
      "indent.update",
    ],
    [
      "POST",
      "/indents/:indentId/approve",
      { indentId: "d-1" },
      "inventory_indent",
      "d-1",
      "indent.update",
    ],
    [
      "POST",
      "/indents/:indentId/reject",
      { indentId: "d-1" },
      "inventory_indent",
      "d-1",
      "indent.update",
    ],
    [
      "POST",
      "/indents/:indentId/cancel",
      { indentId: "d-1" },
      "inventory_indent",
      "d-1",
      "indent.update",
    ],
    [
      "POST",
      "/indents/:indentId/fulfill",
      { indentId: "d-1" },
      "inventory_indent",
      "d-1",
      "indent.update",
    ],
    // Transfers
    ["GET", "/transfers", {}, "inventory_transfer", "list", "transfer.read"],
    ["POST", "/transfers", {}, "inventory_transfer", "new", "transfer.create"],
    [
      "GET",
      "/transfers/:transferId",
      { transferId: "t-1" },
      "inventory_transfer",
      "t-1",
      "transfer.read",
    ],
  ];

  it("has one explicit test case per ROUTE_TABLE entry (no route left untested)", () => {
    expect(cases.length).toBe(INVENTORY_ROUTE_KEYS.length);
    expect(INVENTORY_ROUTE_KEYS.length).toBe(32);
  });

  for (const [method, pattern, params, kind, id, action] of cases) {
    it(`${method} ${pattern} -> ${kind}/${id}/${action}`, async () => {
      const target = await resolver(req(method, pattern, params));
      expect(target).toEqual({ kind, id, action, attr: { iq_tenant_id: TENANT } });
    });
  }

  it("HEAD is folded into GET", async () => {
    const target = await resolver(req("HEAD", "/stores"));
    expect(target).toMatchObject({ kind: "inventory_store", action: "store.read" });
  });

  it("returns null for an unmapped route (fail-closed)", async () => {
    expect(await resolver(req("GET", "/unknown"))).toBeNull();
    expect(await resolver(req("DELETE", "/stores/:storeId", { storeId: "s-1" }))).toBeNull();
  });

  it("returns null when a :id param route is missing its param (fail-closed)", async () => {
    expect(await resolver(req("GET", "/stores/:storeId", {}))).toBeNull();
    expect(await resolver(req("PATCH", "/indents/:indentId", {}))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Completeness: mirrors the authz plugin's onReady PROBE_UUID check. Registers
// the REAL inventory router, collects every route marked authMode:"protected",
// and asserts the resolver maps each to a non-null AuthzTarget. A new protected
// route nobody adds to the ROUTE_TABLE fails here — nothing ships unguarded.
// ---------------------------------------------------------------------------
describe("resolver covers every protected inventory route (PROBE_UUID completeness)", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    while (apps.length > 0) await apps.pop()?.close();
  });

  function probeParams(path: string): Record<string, string> {
    const params: Record<string, string> = {};
    for (const seg of path.split("/")) {
      if (seg.startsWith(":") && seg.length > 1) params[seg.slice(1)] = PROBE_UUID;
    }
    return params;
  }

  it("maps all protected routes and guards nothing extra", async () => {
    const protectedRouteKeys: Array<{ method: string; url: string }> = [];
    const app = Fastify();
    apps.push(app);
    // @fastify/multipart is registered by the svc, not the router; GRN document routes
    // still register fine without it (body parsing only matters at request time).
    app.addHook("onRoute", (route) => {
      const config = route.config as { authMode?: string } | undefined;
      if (config?.authMode !== "protected") return;
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      for (const m of methods) protectedRouteKeys.push({ method: m.toUpperCase(), url: route.url });
    });

    const stub = {} as never;
    await app.register(createRouter({ db: stub, masterDataGateway: stub }), { prefix: PREFIX });
    await app.ready();

    // Fastify auto-registers HEAD for each GET; fold HEAD->GET and dedupe.
    const logicalKeys = new Set(
      protectedRouteKeys.map(({ method, url }) => `${method === "HEAD" ? "GET" : method} ${url}`),
    );
    expect(logicalKeys.size).toBe(32);

    const resolver = createInventoryAuthzTargetResolver();
    for (const { method, url } of protectedRouteKeys) {
      const probe = {
        method,
        url,
        routeOptions: { url },
        params: probeParams(url),
        tenantId: TENANT,
      } as unknown as Parameters<AuthzTargetResolver>[0];
      const target = await resolver(probe);
      expect(target, `unmapped protected route: ${method} ${url}`).not.toBeNull();
    }
  });
});
