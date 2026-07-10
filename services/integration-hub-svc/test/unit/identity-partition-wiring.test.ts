import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { identityPlugin } from "@hims/ts-sdk-identity";
// Compose the REAL skip constant from the module's public API (same import main.ts
// uses), not a copy, so a drift between this test and production 401s here.
import { INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES } from "@hims/integration-hub";

// ---------------------------------------------------------------------------
// Guards the DELIBERATE identity partition of integration-hub-svc. The service
// terminates three surfaces:
//   (a) NHA gateway callbacks on the /api/v3 scope — authenticated by gateway
//       signatures, NOT our JWT. They must be reachable WITHOUT a Bearer.
//   (c) platform-facing routes on /api/abdm/v1 (M1/M2/M3/scan-share/bridge
//       discovery) — every one requires a verified token.
//   (d) health/docs — skipped.
// This composes the REAL identityPlugin + the REAL skip constant and reproduces
// main.ts's scope arrangement with stand-in routes at the REAL paths, asserting
// the 401/skip matrix. Missing-Bearer paths 401 before any JWKS fetch and skipped
// paths return before verification, so the dummy JWKS is never exercised (no network).
// ---------------------------------------------------------------------------

const apps: FastifyInstance[] = [];

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();

  // Top-level health probe (outside any /api scope) — as in main.ts.
  app.get("/healthz", async () => ({ status: "ok" }));

  // (a) NHA gateway callbacks — mounted OUTSIDE the identity plugin, like main.ts.
  await app.register(
    async (v3) => {
      v3.post("/link/on_carecontext", async () => ({ ok: "callback" }));
      v3.post("/hiu/consent/request/on-init", async () => ({ ok: "callback" }));
    },
    { prefix: "/api/v3" },
  );

  // Platform surface — identity gate on /api/abdm/v1, same skip list as main.ts.
  await app.register(
    async (api) => {
      await api.register(async (scoped) => {
        await scoped.register(identityPlugin, {
          jwksUrl: "http://127.0.0.1:1/jwks.json",
          issuer: "https://test.issuer",
          audience: "hims",
          skipPathPrefixes: [...INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES, "/docs"],
        });
        // (d) health — skipped.
        scoped.get("/healthz", async () => ({ status: "ok" }));
        // (c) platform-facing stand-ins at REAL paths.
        scoped.post("/m1/enrol/aadhaar/otp", async () => ({ ok: "m1" }));
        scoped.get("/scan-share/status", async () => ({ ok: "scan-share" }));
        scoped.get("/m0/bridge-services", async () => ({ ok: "bridge" }));
        scoped.get("/tenant/mapped-facility-ids", async () => ({ ok: "mapped" }));
        // Segment-boundary probe: a REGISTERED lookalike sharing the "healthz" prefix
        // start. If the skip prefix leaked past the segment boundary it would be
        // wrongly skipped (200); it must stay identity-gated (401).
        scoped.get("/healthz-diagnostics", async () => ({ ok: "lookalike" }));
      }, { prefix: "/abdm/v1" });
    },
    { prefix: "/api" },
  );

  apps.push(app);
  return app;
}

afterEach(async () => {
  while (apps.length > 0) {
    await apps.pop()?.close();
  }
});

describe("integration-hub identity partition", () => {
  it("(a) NHA callback is reachable WITHOUT a Bearer (separate scope, no identity gate)", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/api/v3/link/on_carecontext" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: "callback" });

    const res2 = await app.inject({
      method: "POST",
      url: "/api/v3/hiu/consent/request/on-init",
    });
    expect(res2.statusCode).toBe(200);
  });

  it("(c) M1 enrol requires a verified token — 401 without a Bearer", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/api/abdm/v1/m1/enrol/aadhaar/otp" });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("AUTH_MISSING_BEARER");
  });

  it("(c) scan-share status requires a verified token — 401 without a Bearer", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/abdm/v1/scan-share/status" });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("AUTH_MISSING_BEARER");
  });

  it("(c) bridge discovery is NOT skipped — 401 without a Bearer (header-trust hole closed)", async () => {
    const app = await buildApp();
    for (const url of [
      "/api/abdm/v1/m0/bridge-services",
      "/api/abdm/v1/tenant/mapped-facility-ids",
    ]) {
      const res = await app.inject({ method: "GET", url });
      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe("AUTH_MISSING_BEARER");
    }
  });

  it("(d) health probes are reachable WITHOUT a Bearer (skipped)", async () => {
    const app = await buildApp();
    const top = await app.inject({ method: "GET", url: "/healthz" });
    expect(top.statusCode).toBe(200);
    const scoped = await app.inject({ method: "GET", url: "/api/abdm/v1/healthz" });
    expect(scoped.statusCode).toBe(200);
  });

  it("skip list is segment-bounded — a registered healthz lookalike is still identity-gated", async () => {
    const app = await buildApp();
    // Wrongly-widened prefix would skip this and return 200; correct boundary → 401.
    const res = await app.inject({ method: "GET", url: "/api/abdm/v1/healthz-diagnostics" });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("AUTH_MISSING_BEARER");
  });
});
