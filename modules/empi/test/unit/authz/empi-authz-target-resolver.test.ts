import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";
import { createEmpiAuthzTargetResolver } from "../../../src/authz/empi-authz-target-resolver.js";
import { createRouter } from "../../../src/router.js";
import type {
  PatientRepo,
  AddressRepo,
  IdentifierRepo,
  SourceRecordRepo,
} from "../../../src/ports.js";
import type { EventBus } from "@hims/ts-sdk-events";

const PREFIX = "/api/empi/v1";
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

describe("createEmpiAuthzTargetResolver — explicit mappings", () => {
  const resolver = createEmpiAuthzTargetResolver();

  const cases: Array<[string, string, Record<string, string>, string, string]> = [
    // method, routePattern, params, expected id, expected action
    ["POST", "/patients", {}, "new", "patient.create"],
    ["GET", "/patients", {}, "list", "patient.read"],
    ["GET", "/patients/find", {}, "find", "patient.read"],
    ["POST", "/patients/find-by-demographics", {}, "find-by-demographics", "patient.read"],
    ["GET", "/patients/:id", { id: "p-1" }, "p-1", "patient.read"],
    ["PATCH", "/patients/:id", { id: "p-1" }, "p-1", "patient.update"],
    ["PATCH", "/patients/:id/status", { id: "p-1" }, "p-1", "patient.update"],
    ["POST", "/patients/:id/identifiers", { id: "p-1" }, "p-1", "patient.update"],
    [
      "DELETE",
      "/patients/:id/identifiers/:identifierId",
      { id: "p-1", identifierId: "i-1" },
      "p-1",
      "patient.delete",
    ],
    ["POST", "/patients/:id/addresses", { id: "p-1" }, "p-1", "patient.update"],
    [
      "PATCH",
      "/patients/:id/addresses/:addressId",
      { id: "p-1", addressId: "a-1" },
      "p-1",
      "patient.update",
    ],
  ];

  for (const [method, pattern, params, id, action] of cases) {
    it(`${method} ${pattern} -> empi_patient/${id}/${action}`, async () => {
      const target = await resolver(req(method, pattern, params));
      expect(target).toEqual({
        kind: "empi_patient",
        id,
        action,
        attr: { iq_tenant_id: TENANT },
      });
    });
  }

  it("HEAD is folded into GET", async () => {
    const target = await resolver(req("HEAD", "/patients"));
    expect(target).toMatchObject({ kind: "empi_patient", action: "patient.read" });
  });

  it("returns null for an unmapped route (fail-closed, treated as a mapping gap)", async () => {
    const target = await resolver(req("GET", "/unknown"));
    expect(target).toBeNull();
  });

  it("returns null when a :id param route is missing its param", async () => {
    const target = await resolver(req("GET", "/patients/:id", {}));
    expect(target).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Completeness: mirrors the authz plugin's onReady PROBE_UUID check. Registers
// the REAL empi router, collects every route marked authMode:"protected", and
// asserts the resolver maps each to a non-null AuthzTarget. A new protected
// route that nobody adds to the ROUTE_TABLE fails here — nothing ships unguarded.
// ---------------------------------------------------------------------------
describe("resolver covers every protected empi route (PROBE_UUID completeness)", () => {
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
    app.addHook("onRoute", (route) => {
      const config = route.config as { authMode?: string } | undefined;
      if (config?.authMode !== "protected") return;
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      for (const m of methods) protectedRouteKeys.push({ method: m.toUpperCase(), url: route.url });
    });

    const stub = {} as never;
    await app.register(
      createRouter({
        patientRepo: stub as PatientRepo,
        addressRepo: stub as AddressRepo,
        identifierRepo: stub as IdentifierRepo,
        sourceRecordRepo: stub as SourceRecordRepo,
        eventBus: stub as EventBus,
        allocatePatientUhid: async () => "uhid",
      }),
      { prefix: PREFIX },
    );
    await app.ready();

    // Fastify auto-registers a HEAD for each GET; fold HEAD->GET and dedupe so the
    // count reflects the 11 logical golden-record routes (no accidental public route).
    const logicalKeys = new Set(
      protectedRouteKeys.map(
        ({ method, url }) => `${method === "HEAD" ? "GET" : method} ${url}`,
      ),
    );
    expect(logicalKeys.size).toBe(11);

    const resolver = createEmpiAuthzTargetResolver();
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
      expect(target?.kind).toBe("empi_patient");
    }
  });
});
