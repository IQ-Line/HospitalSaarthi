import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { registerInternalUserStatusHandlers } from "../../../src/rest-handlers/internal-user-status-handlers.js";
import type { UserActivationFacts } from "../../../src/domain/user-activation.js";
import type { UserActivationStatusReaderPort } from "../../../src/ports/user-activation-status-reader.js";

const KEY = "s2s-secret";
const PAST = new Date("2000-01-01T00:00:00.000Z"); // unambiguously lapsed vs wall clock
const TENANT = "11111111-1111-1111-1111-111111111111";
const USER = "22222222-2222-2222-2222-222222222222";

type Call = { tenantId: string; userId: string };

/** Records every call and returns the programmed facts (or null for "unknown user"). */
function stubReader(facts: UserActivationFacts | null): {
  port: UserActivationStatusReaderPort;
  calls: Call[];
} {
  const calls: Call[] = [];
  return {
    calls,
    port: {
      async getActivationFacts(tenantId, userId) {
        calls.push({ tenantId, userId });
        return facts;
      },
    },
  };
}

const apps: FastifyInstance[] = [];

function buildApp(reader: UserActivationStatusReaderPort): FastifyInstance {
  const app = Fastify();
  registerInternalUserStatusHandlers(app, {
    userActivationStatusReader: reader,
    internalApiKey: KEY,
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  while (apps.length > 0) {
    await apps.pop()?.close();
  }
});

const path = (userId = USER, tenantId: string | null = TENANT): string =>
  tenantId === null
    ? `/internal/users/${userId}/active`
    : `/internal/users/${userId}/active?tenant_id=${tenantId}`;

describe("registerInternalUserStatusHandlers", () => {
  it("rejects a missing internal key with 401 (and never touches the reader)", async () => {
    const { port, calls } = stubReader({ status: "active", banned: false, banExpires: null });
    const res = await buildApp(port).inject({ method: "GET", url: path() });
    expect(res.statusCode).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("rejects a wrong internal key with 401", async () => {
    const { port, calls } = stubReader({ status: "active", banned: false, banExpires: null });
    const res = await buildApp(port).inject({
      method: "GET",
      url: path(),
      headers: { "x-um-internal-key": "wrong" },
    });
    expect(res.statusCode).toBe(401);
    expect(calls).toHaveLength(0); // never touches the reader on auth failure
  });

  it("requires tenant_id (400) even with a valid key", async () => {
    const { port, calls } = stubReader({ status: "active", banned: false, banExpires: null });
    const res = await buildApp(port).inject({
      method: "GET",
      url: path(USER, null),
      headers: { "x-um-internal-key": KEY },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "tenant_id_required" });
    expect(calls).toHaveLength(0);
  });

  it("requires a non-blank userId (400)", async () => {
    const { port } = stubReader({ status: "active", banned: false, banExpires: null });
    const res = await buildApp(port).inject({
      method: "GET",
      url: path("%20"), // whitespace -> trims to empty
      headers: { "x-um-internal-key": KEY },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "user_id_required" });
  });

  it("returns active:true for an active, unbanned user and passes through tenant+user", async () => {
    const { port, calls } = stubReader({ status: "active", banned: false, banExpires: null });
    const res = await buildApp(port).inject({
      method: "GET",
      url: path(),
      headers: { "x-um-internal-key": KEY },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ active: true });
    expect(calls).toEqual([{ tenantId: TENANT, userId: USER }]);
  });

  it("returns active:false for an inactive user", async () => {
    const { port } = stubReader({ status: "inactive", banned: false, banExpires: null });
    const res = await buildApp(port).inject({
      method: "GET",
      url: path(),
      headers: { "x-um-internal-key": KEY },
    });
    expect(res.json()).toEqual({ active: false });
  });

  it("returns active:false for a permanently banned (but status-active) user", async () => {
    const { port } = stubReader({ status: "active", banned: true, banExpires: null });
    const res = await buildApp(port).inject({
      method: "GET",
      url: path(),
      headers: { "x-um-internal-key": KEY },
    });
    expect(res.json()).toEqual({ active: false });
  });

  it("returns active:true when a ban expiry is in the past (lapsed)", async () => {
    const { port } = stubReader({ status: "active", banned: true, banExpires: PAST });
    const res = await buildApp(port).inject({
      method: "GET",
      url: path(),
      headers: { "x-um-internal-key": KEY },
    });
    expect(res.json()).toEqual({ active: true });
  });

  it("reports active:false for an unknown user", async () => {
    const { port } = stubReader(null);
    const res = await buildApp(port).inject({
      method: "GET",
      url: path(),
      headers: { "x-um-internal-key": KEY },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ active: false });
  });
});
