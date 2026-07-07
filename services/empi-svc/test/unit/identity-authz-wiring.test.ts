import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { identityPlugin } from "@hims/ts-sdk-identity";

// ---------------------------------------------------------------------------
// Guards the empi-svc identity WIRING (see services/empi-svc/src/main.ts). EMPI
// is golden-record PHI: the PEP stack is ALWAYS on (no ENABLE_AUTH opt-out), so
// every route under /api/empi/v1 must 401 without a Bearer token, and the only
// identity-skip is "/docs". EMPI exposes NO key-gated internal S2S routes, so
// there must be NO blanket /internal skip — an /internal path stays 401'd.
//
// This composes the REAL identityPlugin with the SAME skip list as main.ts and
// mounts stand-in routes at representative paths. It proves the prefix↔path
// match only; Cerbos capability enforcement is covered by the module resolver
// test + the cerbos policy suite + the live matrix.
// ---------------------------------------------------------------------------

// Mirrors main.ts: `skipPathPrefixes: ["/docs"]`.
const EMPI_IDENTITY_SKIP_PREFIXES = ["/docs"] as const;

const apps: FastifyInstance[] = [];

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();

  // Health lives at the app root, OUTSIDE the authenticated /api/empi/v1 scope.
  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(
    async (api) => {
      // Dummy JWKS/issuer/audience are never exercised: skipped paths return
      // before verification; missing-Bearer paths 401 before any JWKS fetch.
      await api.register(identityPlugin, {
        jwksUrl: "http://127.0.0.1:1/jwks.json",
        issuer: "https://test.issuer",
        audience: "hims",
        skipPathPrefixes: [...EMPI_IDENTITY_SKIP_PREFIXES],
      });
      // Stand-in protected route at a REAL golden-record path.
      api.get(
        "/patients/:id",
        { config: { authMode: "protected" } },
        async () => ({ ok: "patient" }),
      );
      // Stand-in at a would-be internal path: EMPI has none, so it must NOT be skipped.
      api.post(
        "/internal/anything",
        { config: { authMode: "public" } },
        async () => ({ ok: "internal" }),
      );
    },
    { prefix: "/api/empi/v1" },
  );

  apps.push(app);
  return app;
}

afterEach(async () => {
  while (apps.length > 0) await apps.pop()?.close();
});

describe("empi-svc identity/authz wiring", () => {
  it("health is reachable without a Bearer (root, outside the auth scope)", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("a protected golden-record route 401s without a Bearer", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/empi/v1/patients/00000000-0000-4000-8000-000000000001",
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("AUTH_MISSING_BEARER");
  });

  it("does NOT over-skip: an /internal path still 401s (no blanket S2S bypass)", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/api/empi/v1/internal/anything" });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("AUTH_MISSING_BEARER");
  });

  it("skips /docs (identity steps aside; unregistered doc path routes to 404, not 401)", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/empi/v1/docs/anything" });
    expect(res.statusCode).not.toBe(401);
  });
});
