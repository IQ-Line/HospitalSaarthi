import Fastify from "fastify";
import { authzPlugin } from "@hims/ts-sdk-authz";
import fp from "fastify-plugin";
import { afterEach, describe, expect, it } from "vitest";

const apps: Array<ReturnType<typeof Fastify>> = [];
const identityPluginStub = fp(async () => {}, {
  name: "@hims/ts-sdk-identity",
});

afterEach(async () => {
  await Promise.all(
    apps.map(async (app) => {
      try {
        await app.close();
      } catch {
        // App may fail during ready(); best-effort close keeps tests isolated.
      }
    }),
  );
  apps.length = 0;
});

describe("authz mapping enforcement", () => {
  it("fails startup when a protected route is missing resolver mapping", async () => {
    const app = Fastify();
    apps.push(app);

    await app.register(identityPluginStub);
    await app.register(authzPlugin, {
      cerbosUrl: "127.0.0.1:3593",
    });

    app.get(
      "/unmapped-protected-route",
      { config: { authMode: "protected" } },
      async () => ({ ok: true }),
    );

    await expect(app.ready()).rejects.toThrow(
      "AuthZ mapping incomplete: GET /unmapped-protected-route",
    );
  });
});
