import { afterEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { identityPlugin } from "@hims/ts-sdk-identity";
import { authzPlugin } from "@hims/ts-sdk-authz";
import { principalRoleEnricherPlugin } from "@hims/user-management";
import {
  CONFIGURATOR_IDENTITY_SKIP_PATH_PREFIXES,
  createConfiguratorAuthzTargetResolver,
} from "@hims/configurator";

// ---------------------------------------------------------------------------
// Locks the configurator-svc PEP composition (identity -> enricher -> authz -> routes) WITHOUT a
// live PDP (CI-safe). This is the composition main.ts performs:
//   - the enricher (fp name "@hims/user-management-principal-enrichment") and authz plugins
//     register in a child scope BEFORE the routes, so authzPlugin's onRoute hook sees them;
//   - the authzPlugin onReady mapping-completeness probe passes when every `authMode:'protected'`
//     route has a resolver entry, and FAILS (boot rejects) when one does not;
//   - anonymous callers are rejected at identity (401) before the PDP is consulted;
//   - internal S2S skip-prefix routes bypass identity entirely.
// The 200/403 capability decisions require a real Cerbos and are covered by the live round-trip.
// ---------------------------------------------------------------------------

const ISSUER = "https://auth.hims.test";
const AUDIENCE = "hims-platform";
const JWKS_PATH = "/.well-known/jwks.json";
const TENANT_ID = "94478596-14d1-4e7e-b8d2-2995c61c3c90";

/**
 * Composes the real identity -> enricher -> authz stack around a set of routes registered at the
 * REAL protected paths (as no-op handlers). Enricher deps are never invoked for anonymous / S2S /
 * probe requests, so stubs suffice.
 */
async function buildApp(opts: { unmappedProtected?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify();

  await app.register(identityPlugin, {
    jwksUrl: `${ISSUER}${JWKS_PATH}`,
    issuer: ISSUER,
    audience: AUDIENCE,
    skipPathPrefixes: [...CONFIGURATOR_IDENTITY_SKIP_PATH_PREFIXES, "/docs"],
  });

  await app.register(
    async (api) => {
      await api.register(principalRoleEnricherPlugin, {
        principalService: {} as never,
        userRepository: { findUserByGlobalId: async () => undefined } as never,
      });
      await api.register(authzPlugin, {
        cerbosUrl: "localhost:3593",
        resolveTarget: createConfiguratorAuthzTargetResolver(),
      });

      const noop = async () => ({ ok: true });
      const protectedCfg = { config: { authMode: "protected" as const } };

      // A representative spread of the real protected surface (single + multi-word, path-param).
      api.get("/organizations", protectedCfg, noop);
      api.post("/organizations", protectedCfg, noop);
      api.patch("/organizations/:id", protectedCfg, noop);
      api.post("/tenants/:tenantId/modules", protectedCfg, noop);
      api.get("/tenants/:tenantId/integration-profiles", protectedCfg, noop);
      api.put(
        "/tenants/:tenantId/sequence-configuration/identifiers/:identifierType",
        protectedCfg,
        noop,
      );
      api.post("/branding-logos/tenant", protectedCfg, noop);
      api.post("/tenant-onboarding", protectedCfg, noop);

      // A public tenant read + an internal S2S route (must NOT be gated).
      api.get("/tenants", noop);
      api.get("/integration-profiles/by-hip/:hipId", noop);

      if (opts.unmappedProtected) {
        api.get("/unmapped-protected", protectedCfg, noop);
      }
    },
    { prefix: "/api/configurator/v1" },
  );

  await app.ready();
  return app;
}

describe("configurator-svc Cerbos PEP composition", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it("boots: onReady mapping-completeness probe passes for the wired protected routes", async () => {
    const app = await buildApp();
    apps.push(app);
    expect(app.hasRoute({ method: "POST", url: "/api/configurator/v1/tenant-onboarding" })).toBe(
      true,
    );
  });

  it("boot FAILS when a protected route has no resolver mapping (negative probe)", async () => {
    await expect(buildApp({ unmappedProtected: true })).rejects.toThrow(
      /AuthZ mapping incomplete/i,
    );
  });

  const anonymousProtected = [
    { method: "GET" as const, url: "/api/configurator/v1/organizations" },
    { method: "POST" as const, url: `/api/configurator/v1/tenants/${TENANT_ID}/modules` },
    { method: "POST" as const, url: "/api/configurator/v1/tenant-onboarding" },
  ];

  it.each(anonymousProtected)(
    "$method $url without a bearer → 401 at identity (before the PDP)",
    async ({ method, url }) => {
      const app = await buildApp();
      apps.push(app);
      const res = await app.inject({ method, url, payload: {} });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({ code: "AUTH_MISSING_BEARER" });
    },
  );

  it("internal S2S route (skip-prefix) bypasses identity — reachable without a bearer", async () => {
    const app = await buildApp();
    apps.push(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/configurator/v1/integration-profiles/by-hip/HIP-1",
    });
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).toBe(200);
  });
});
