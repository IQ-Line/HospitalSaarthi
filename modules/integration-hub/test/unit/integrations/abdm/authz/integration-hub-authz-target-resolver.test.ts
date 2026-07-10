import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";
import { createIntegrationHubAuthzTargetResolver } from "../../../../../src/authz/integration-hub-authz-target-resolver.js";
import { registerM2PlatformRoutes } from "../../../../../src/integrations/abdm/rest-handlers/m2/m2-platform-routes.js";
import { registerM3PlatformRoutes } from "../../../../../src/integrations/abdm/rest-handlers/m3/m3-platform-routes.js";

const PREFIX = "/api/abdm/v1";
const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PROBE_UUID = "00000000-0000-0000-0000-000000000000";
const KIND = "abdm";

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

describe("createIntegrationHubAuthzTargetResolver — explicit mappings", () => {
  const resolver = createIntegrationHubAuthzTargetResolver();

  // method, routePattern, params, expected id, expected action
  const cases: Array<[string, string, Record<string, string>, string, string]> = [
    // M2 care-context linking
    ["POST", "/m2/link-token/acquire", {}, "link-token-acquire", "care-context.create"],
    ["GET", "/m2/link-token/status", {}, "link-token-status", "care-context.read"],
    ["GET", "/m2/sessions/:sessionId", { sessionId: "s-1" }, "s-1", "care-context.read"],
    ["POST", "/m2/hip/initiated-link/start", {}, "hip-initiated-link-start", "care-context.create"],
    ["POST", "/m2/orchestrate/after-care-contexts", {}, "orchestrate-after-care-contexts", "care-context.create"],
    ["POST", "/m2/add-contexts/publish", {}, "add-contexts-publish", "care-context.create"],
    ["POST", "/m2/sms/notify", {}, "sms-notify", "care-context.create"],
    // M3 HIU consent
    ["GET", "/m3/hiu/consent/requests", {}, "consent-requests", "consent.read"],
    ["POST", "/m3/hiu/consent/request", {}, "consent-request", "consent.create"],
    ["GET", "/m3/hiu/consent/request/:sessionId", { sessionId: "s-9" }, "s-9", "consent.read"],
    // M3 health data (PHI)
    ["GET", "/m3/hiu/consent/request/:sessionId/records", { sessionId: "s-9" }, "s-9", "health-data.read"],
    ["POST", "/m3/hiu/data-request", {}, "data-request", "health-data.create"],
    ["GET", "/m3/hiu/transfers/:transferId", { transferId: "t-3" }, "t-3", "health-data.read"],
    ["GET", "/m3/hiu/attachment/:sessionId/:bundleId/:num", { sessionId: "s-2", bundleId: "b-1", num: "0" }, "s-2", "health-data.read"],
  ];

  for (const [method, pattern, params, id, action] of cases) {
    it(`${method} ${pattern} -> ${KIND}/${id}/${action}`, async () => {
      const target = await resolver(req(method, pattern, params));
      expect(target).toEqual({ kind: KIND, id, action, attr: { iq_tenant_id: TENANT } });
    });
  }

  it("HEAD is folded into GET", async () => {
    const target = await resolver(req("HEAD", "/m2/link-token/status"));
    expect(target).toMatchObject({ kind: KIND, action: "care-context.read" });
  });

  it("returns null for an unmapped route (fail-closed — treated as a mapping gap)", async () => {
    expect(await resolver(req("GET", "/m1/enrol/aadhaar/otp"))).toBeNull();
    expect(await resolver(req("GET", "/unknown"))).toBeNull();
  });

  it("falls back to the descriptive default id when a :param is absent (unreachable at runtime — Fastify always supplies matched params)", async () => {
    const target = await resolver(req("GET", "/m2/sessions/:sessionId", {}));
    expect(target).toMatchObject({ kind: KIND, id: "session", action: "care-context.read" });
  });
});

// ---------------------------------------------------------------------------
// Completeness: mirrors the authz plugin's onReady PROBE check. Registers the REAL
// M2+M3 platform route handlers, collects every route flagged authMode:"protected",
// and asserts the resolver maps each to a non-null AuthzTarget. A new protected
// platform route that nobody adds to the ROUTE_TABLE fails here — nothing ships
// unguarded.
// ---------------------------------------------------------------------------
describe("resolver covers every protected M2/M3 platform route (PROBE completeness)", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    while (apps.length > 0) await apps.pop()?.close();
  });

  function probeParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    for (const seg of url.split("/")) {
      if (seg.startsWith(":") && seg.length > 1) params[seg.slice(1)] = PROBE_UUID;
    }
    return params;
  }

  it("maps all protected routes and guards nothing extra", async () => {
    const resolver = createIntegrationHubAuthzTargetResolver();
    const protectedRoutes: Array<{ method: string; url: string }> = [];
    const app = Fastify();
    apps.push(app);
    app.addHook("onRoute", (route) => {
      const config = route.config as { authMode?: string } | undefined;
      if (config?.authMode !== "protected") return;
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      for (const m of methods) protectedRoutes.push({ method: m.toUpperCase(), url: route.url });
    });

    await app.register(
      async (scope) => {
        await registerM2PlatformRoutes(scope);
        await registerM3PlatformRoutes(scope);
      },
      { prefix: PREFIX },
    );
    await app.ready();

    // 14 explicit M2/M3 platform routes; Fastify auto-adds a HEAD twin per GET (7),
    // so 21 protected route entries — all must be mapped (HEAD folds to GET).
    expect(protectedRoutes.length).toBe(21);
    const posts = protectedRoutes.filter((r) => r.method !== "HEAD");
    expect(posts.length).toBe(14);

    for (const { method, url } of protectedRoutes) {
      const target = await resolver(req(method, url.slice(PREFIX.length), probeParams(url)));
      expect(target, `unmapped protected route ${method} ${url}`).not.toBeNull();
    }
  });
});
