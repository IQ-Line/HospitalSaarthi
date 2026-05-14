import Fastify from "fastify";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { createRouter } from "@hims/abdm-adapter";

const PORT = Number(process.env["ABDM_ADAPTER_SVC_PORT"] ?? 3007);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const JWKS_URL =
  process.env["JWKS_URL"] ?? "http://localhost:3000/.well-known/jwks.json";
const ENABLE_AUTH = process.env["ENABLE_AUTH"] === "true";

const fastifyAjv = {
  customOptions: {
    removeAdditional: false as const,
    coerceTypes: true,
    useDefaults: true,
  },
};

async function main() {
  const app = Fastify({ logger: true, ajv: fastifyAjv });

  app.get("/healthz", async () => ({ status: "ok" }));

  // TODO: instantiate concretions once the dev fills the data-access stubs:
  //   const db = createDb(DATABASE_URL);
  //   const sessions = new DrizzleAbdmSessionsRepo(db);
  //   const secrets = new EnvSecretsClient();
  //   const gateway = new HttpGatewayClient({ secrets });
  //   const fidelius = new Fidelius();
  //
  // and thread them into createRouter({ sessions, gateway, fidelius, secrets }).
  void DATABASE_URL;
  void createDb;

  const abdmRouter = createRouter({
    sessions: null as never,
    gateway: null as never,
    fidelius: null as never,
    secrets: null as never,
  });

  await app.register(async (api) => {
    if (ENABLE_AUTH) {
      const { identityPlugin } = await import("@hims/ts-sdk-identity");
      await api.register(identityPlugin, { jwksUrl: JWKS_URL });
    }
    await api.register(tenantPlugin);

    await api.register(async (scopedApp) => {
      await scopedApp.register(abdmRouter);
    }, { prefix: "/abdm/v1" });
  }, { prefix: "/api" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start abdm-adapter-svc:", err);
  process.exit(1);
});
