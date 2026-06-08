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
import {
  applyPharmacySchemaMigration,
  createPharmacyAuthzTargetResolver,
  createRouter,
  HttpEmpiGateway,
  HttpMasterDataGateway,
  HttpOpdGateway,
} from "@hims/pharmacy";
import { resolvePharmacyRequestTenantId } from "./resolve-pharmacy-tenant-id.js";
import { createPharmacyUserLookup } from "./adapters/pharmacy-user-lookup.js";

const PORT = Number(process.env["PHARMACY_SVC_PORT"] ?? 3004);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const CERBOS_URL = process.env["CERBOS_URL"];
const OPD_URL = process.env["OPD_URL"] ?? "http://localhost:8020";
const EMPI_URL = process.env["EMPI_URL"] ?? "http://localhost:3002";
const MASTER_DATA_URL = process.env["MASTER_DATA_URL"] ?? "http://localhost:8010";
const PHARMACY_DEV_TENANT_ID =
  process.env["PHARMACY_DEV_TENANT_ID"] ?? "00000000-0000-0000-0000-000000000007";

async function main() {
  if (!CERBOS_URL) {
    throw new Error("CERBOS_URL environment variable is required");
  }

  const app = Fastify({ logger: true });

  await registerOpenApiDocs(app, {
    serviceId: "pharmacy",
    title: "Pharmacy API",
    version: "1.0.0",
    description: "Custom pharmacy counter — OPD queue, dispense lines, manual billing.",
    apiPrefix: "/api/pharmacy/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  if (!DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required for pharmacy-svc");
  }

  if (process.env["PHARMACY_SKIP_MIGRATE"] !== "true") {
    await applyPharmacySchemaMigration(DATABASE_URL);
    app.log.info("Pharmacy schema migration applied (or already up to date)");
  }

  const db = createDb(DATABASE_URL);
  const opdGateway = new HttpOpdGateway(OPD_URL, {
    warn: (detail, message) => app.log.warn(detail, message),
  });
  const empiGateway = new HttpEmpiGateway(EMPI_URL, {
    warn: (detail, message) => app.log.warn(detail, message),
  });
  const masterDataGateway = new HttpMasterDataGateway(MASTER_DATA_URL, {
    warn: (detail, message) => app.log.warn(detail, message),
  });

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
  const userLookup = createPharmacyUserLookup(userRepository);

  await assertCerbosReachable(CERBOS_URL);

  await app.register(async (api) => {
    api.addHook("onRequest", async (request) => {
      const tenant = resolvePharmacyRequestTenantId(request.headers, PHARMACY_DEV_TENANT_ID);
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
      resolveTarget: createPharmacyAuthzTargetResolver(),
    });

    await api.register(
      createRouter({
        db,
        opdGateway,
        empiGateway,
        masterDataGateway,
        userLookup,
      }),
    );
  }, { prefix: "/api/pharmacy/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start pharmacy-svc:", err);
  process.exit(1);
});
