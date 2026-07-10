import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { enforcePrincipalTenant } from "../../../src/authz/principal-tenant-hook.js";
import { registerStoreHandlers } from "../../../src/rest-handlers/stores.handlers.js";
import type { InventoryDeps, StoreRepo } from "../../../src/ports.js";

const PRINCIPAL_TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FOREIGN_TENANT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/**
 * Faithful, dependency-free stand-in for `@hims/ts-sdk-tenant`'s header→tenantId step
 * (that package is a svc-level dep, not a module dep). It runs AFTER enforcePrincipalTenant
 * exactly as tenantPlugin does in the svc, so if a foreign header survived it would win here —
 * which is precisely what enforcePrincipalTenant must prevent by overwriting it upstream.
 */
async function tenantPluginStandIn(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers["iq_tenant_id"] ?? request.headers["x-tenant-id"];
  const user = (request as { user?: { tenantId?: string } }).user;
  const tenantId = (typeof header === "string" ? header : undefined) ?? user?.tenantId;
  if (!tenantId) {
    await reply.code(400).send({ error: "Bad Request", message: "Missing tenant id" });
    return;
  }
  request.tenantId = tenantId;
}

/**
 * Boots a minimal app with the SAME hook order the svc uses:
 *   (fake identity → populates request.user) → enforcePrincipalTenant → tenantPlugin(-stand-in).
 * `principalTenant` mimics identityPlugin having verified the JWT `iq_tenant_id` claim.
 */
async function buildApp(
  principalTenant: string | undefined,
  register: (app: FastifyInstance) => void,
): Promise<FastifyInstance> {
  const app = Fastify();
  app.decorateRequest("tenantId", "");
  app.addHook("onRequest", async (request: FastifyRequest) => {
    if (principalTenant !== undefined) {
      (request as { user?: { tenantId: string; userId: string } }).user = {
        tenantId: principalTenant,
        userId: "user-1",
      };
    }
  });
  app.addHook("onRequest", enforcePrincipalTenant);
  app.addHook("onRequest", tenantPluginStandIn);
  register(app);
  await app.ready();
  return app;
}

describe("enforcePrincipalTenant — tenant derives from the verified principal, not the header", () => {
  const apps: FastifyInstance[] = [];
  afterEach(async () => {
    while (apps.length > 0) await apps.pop()?.close();
  });

  async function echoApp(principalTenant: string | undefined): Promise<FastifyInstance> {
    const app = await buildApp(principalTenant, (a) => {
      a.get("/whoami", async (request) => ({ tenantId: request.tenantId }));
    });
    apps.push(app);
    return app;
  }

  it("derives tenant from the principal when NO tenant header is sent", async () => {
    const app = await echoApp(PRINCIPAL_TENANT);
    const res = await app.inject({ method: "GET", url: "/whoami" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tenantId: PRINCIPAL_TENANT });
  });

  it("IGNORES a foreign tenant header — principal tenant wins (spoof-proof)", async () => {
    const app = await echoApp(PRINCIPAL_TENANT);
    const res = await app.inject({
      method: "GET",
      url: "/whoami",
      headers: { iq_tenant_id: FOREIGN_TENANT, "x-tenant-id": FOREIGN_TENANT },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tenantId: PRINCIPAL_TENANT });
  });

  it("is a no-op without a principal — header-less unauthenticated call fails closed (400)", async () => {
    const app = await echoApp(undefined);
    const res = await app.inject({ method: "GET", url: "/whoami" });
    // tenantPlugin rejects: no header, no principal → no silent hardcoded-UUID fallback.
    expect(res.statusCode).toBe(400);
  });
});

describe("store handler — a foreign tenant header cannot switch the queried tenant", () => {
  const apps: FastifyInstance[] = [];
  afterEach(async () => {
    while (apps.length > 0) await apps.pop()?.close();
  });

  /** Fake StoreRepo that records the tenantId every listStores call is scoped to. */
  function recordingStoreRepo(): { repo: StoreRepo; queriedTenants: string[] } {
    const queriedTenants: string[] = [];
    const repo = {
      async list(tenantId: string) {
        queriedTenants.push(tenantId);
        return { rows: [], total: 0 };
      },
    } as unknown as StoreRepo;
    return { repo, queriedTenants };
  }

  it("mutation-proof: GET /stores with a foreign header still queries the PRINCIPAL tenant", async () => {
    const { repo, queriedTenants } = recordingStoreRepo();
    const deps = { storeRepo: repo, masterDataGateway: {} as never } as InventoryDeps;

    const app = await buildApp(PRINCIPAL_TENANT, (a) => {
      registerStoreHandlers(a, deps);
    });
    apps.push(app);

    const res = await app.inject({
      method: "GET",
      url: "/stores",
      headers: { iq_tenant_id: FOREIGN_TENANT, "x-tenant-id": FOREIGN_TENANT },
    });

    expect(res.statusCode).toBe(200);
    // The repository was scoped to the principal's tenant — never the spoofed foreign one.
    expect(queriedTenants).toEqual([PRINCIPAL_TENANT]);
    expect(queriedTenants).not.toContain(FOREIGN_TENANT);
  });
});
