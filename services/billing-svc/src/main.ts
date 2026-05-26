import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { validateAuthConfig, identityPlugin } from "@hims/ts-sdk-identity";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import {
  DrizzleUserRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzlePrincipalAuthorizationRepository,
  createDefaultPrincipalService,
  principalRoleEnricherPlugin,
} from "@hims/user-management";
import { createRouter, createBillingAuthzTargetResolver } from "@hims/billing";
import { resolveBillingRequestTenantId } from "./resolve-billing-tenant-id.js";

const PORT = Number(process.env["BILLING_SVC_PORT"] ?? 3003);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const CERBOS_URL = process.env["CERBOS_URL"];
/** Dev-only fallback when Swagger/curl omit tenant headers (not the live dev-bootstrap UUID). */
const BILLING_DEV_TENANT_ID =
  process.env["BILLING_DEV_TENANT_ID"] ?? "00000000-0000-0000-0000-000000000007";
const USE_MOCK_DATA = process.env["BILLING_USE_MOCK_DATA"] === "true";

async function main() {
  if (!CERBOS_URL) {
    throw new Error("CERBOS_URL environment variable is required");
  }

  const app = Fastify({ logger: true });

  await registerOpenApiDocs(app, {
    serviceId: "billing",
    title: "Billing API",
    version: "1.0.0",
    description: "Billing module HTTP surface.",
    apiPrefix: "/api/billing/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  const db = USE_MOCK_DATA ? undefined : createDb(DATABASE_URL);
  if (USE_MOCK_DATA) {
    app.log.warn("BILLING_USE_MOCK_DATA=true — charges are in-memory only");
  } else if (!DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required when BILLING_USE_MOCK_DATA is not true");
  }

  const identityAuth = validateAuthConfig();
  const umDb = createDb(DATABASE_URL);
  const userRepository = new DrizzleUserRepository(umDb);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(umDb);
  const principalAuthorizationRepository = new DrizzlePrincipalAuthorizationRepository(umDb);
  const principalService = createDefaultPrincipalService({
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
  });

  await assertCerbosReachable(CERBOS_URL);

  await app.register(async (api) => {
    api.addHook("onRequest", async (request) => {
      const tenant = resolveBillingRequestTenantId(request.headers, BILLING_DEV_TENANT_ID);
      request.headers["iq_tenant_id"] = tenant;
      request.headers["x-tenant-id"] = tenant;
    });
    await api.register(tenantPlugin);

    await api.register(identityPlugin, {
      ...identityAuth,
      skipPathPrefixes: ["/docs"],
    });
    await api.register(principalRoleEnricherPlugin, {
      principalService,
      userRepository,
    });
    await api.register(authzPlugin, {
      cerbosUrl: CERBOS_URL,
      resolveTarget: createBillingAuthzTargetResolver(),
    });

    await api.register(createRouter({ db, useMock: USE_MOCK_DATA }));
  }, { prefix: "/api/billing/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start billing-svc:", err);
  process.exit(1);
});
