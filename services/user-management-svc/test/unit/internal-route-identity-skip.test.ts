import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { identityPlugin } from "@hims/ts-sdk-identity";
import { USER_MANAGEMENT_IDENTITY_SKIP_PREFIXES } from "../../src/auth/identity-skip-prefixes.js";

// ---------------------------------------------------------------------------
// Guards the identity-skip WIRING for the D13 ban-cutoff route — the gap a bare
// handler test cannot see. Internal routes mount BEHIND identityPlugin's onRequest
// hook, which 401s any non-skipped path lacking a Bearer token. The S2S caller
// sends x-um-internal-key, NOT a JWT, so unless the route's prefix is in
// skipPathPrefixes it is 401'd before the handler runs and the cutoff silently
// never fires. This composes the REAL identityPlugin + the REAL skip constant and
// asserts BOTH directions: the key-gated internal subtrees are skipped (reachable),
// AND the JWT-protected diagnostics subtree is NOT (no blanket /internal exposure).
//
// Scope split: this proves the prefix↔path match only. The handlers' OWN behaviour
// (x-um-internal-key gate, active computation) is covered by the module unit tests;
// stand-in routes here mount at the REAL paths so a prefix/path mismatch is caught.
// ---------------------------------------------------------------------------

const TENANT = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const ACTIVE_PATH = `/api/user-management/internal/users/${USER}/active?tenant_id=${TENANT}`;

const apps: FastifyInstance[] = [];

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  // Same registration as main.ts. Dummy JWKS/issuer/audience are never exercised:
  // skipped paths return before verification; missing-Bearer paths 401 before any
  // JWKS fetch — so no network occurs.
  await app.register(identityPlugin, {
    jwksUrl: "http://127.0.0.1:1/jwks.json",
    issuer: "https://test.issuer",
    audience: "hims",
    skipPathPrefixes: [...USER_MANAGEMENT_IDENTITY_SKIP_PREFIXES],
  });
  await app.register(
    async (scope) => {
      // Stand-ins at the REAL internal path so a prefix↔path mismatch surfaces here.
      scope.get(
        "/internal/users/:userId/active",
        { config: { authMode: "public" } },
        async () => ({ ok: "internal-users" }),
      );
    },
    { prefix: "/api/user-management" },
  );
  apps.push(app);
  return app;
}

afterEach(async () => {
  while (apps.length > 0) {
    await apps.pop()?.close();
  }
});

describe("identity-skip wiring for internal routes", () => {
  it("REACHES the active-status route with no Bearer (skip present → cutoff can fire)", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: ACTIVE_PATH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: "internal-users" });
  });

  it("also skips the tenant-entitlement-cache subtree (no identity 401)", async () => {
    const app = await buildApp();
    // No route registered here -> if skipped, identity steps aside and routing 404s;
    // a 401 AUTH_MISSING_BEARER would mean the skip is missing for this subtree.
    const res = await app.inject({
      method: "POST",
      url: "/api/user-management/internal/tenant-entitlement-cache/invalidate/x",
    });
    expect(res.statusCode).toBe(404);
  });

  it("does NOT over-skip: JWT-protected diagnostics stay identity-guarded", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/user-management/internal/module-entitlements/${TENANT}`, // no Bearer
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("AUTH_MISSING_BEARER"); // identity enforced, not skipped
  });

  it("identity is enforced generally: a normal protected path 401s without a Bearer", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/user-management/users" });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("AUTH_MISSING_BEARER");
  });
});
