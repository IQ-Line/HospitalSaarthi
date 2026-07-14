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
  resolveEffectiveTenantId,
  assertTenantHeaderAllowedForPrincipal,
} from "@hims/user-management";
import {
  applyPharmacySchemaMigration,
  createPharmacyAuthzTargetResolver,
  createRouter,
  HttpMasterDataGateway,
  HttpInventoryGateway,
  HttpOpdGateway,
} from "@hims/pharmacy";
import { createPharmacyUserLookup } from "./adapters/pharmacy-user-lookup.js";

const PORT = Number(process.env["PHARMACY_SVC_PORT"] ?? 3004);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const CERBOS_URL = process.env["CERBOS_URL"];
const OPD_URL = process.env["OPD_URL"] ?? "http://localhost:8020";
const MASTER_DATA_URL = process.env["MASTER_DATA_URL"] ?? "http://localhost:8010";
const INVENTORY_URL = process.env["INVENTORY_URL"] ?? "http://localhost:3008";
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
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      internalServiceKey: {
        type: "apiKey",
        in: "header",
        name: "x-pharmacy-internal-key",
        description:
          "Must match PHARMACY_INTERNAL_API_KEY on pharmacy-svc (internal routes only).",
      },
    },
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
  const masterDataGateway = new HttpMasterDataGateway(MASTER_DATA_URL, {
    warn: (detail, message) => app.log.warn(detail, message),
  });
  const inventoryGateway = new HttpInventoryGateway(INVENTORY_URL, {
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
    await api.register(identityPlugin, {
      ...identityAuth,
      // Internal routes use x-pharmacy-internal-key (see assertPharmacyInternalAccess), not user JWT.
      skipPathPrefixes: ["/docs", "/internal", "/api/pharmacy/v1/internal"],
    });
    await api.register(principalRoleEnricherPlugin, {
      principalService,
      userRepository,
    });

    api.addHook("onRequest", async (request, reply) => {
      const path = request.url.split("?")[0] ?? "";
      if (path.endsWith("/docs") || path.includes("/docs/")) {
        return;
      }

      const requestUser = (request as { user?: unknown }).user;
      if (requestUser != null) {
        const tenantCheck = assertTenantHeaderAllowedForPrincipal(request);
        if (!tenantCheck.ok) {
          return reply.code(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "Tenant header does not match authenticated principal",
          });
        }
        const tenant = resolveEffectiveTenantId(request);
        request.headers["iq_tenant_id"] = tenant;
        request.headers["x-tenant-id"] = tenant;
        return;
      }

      const headerTenant =
        typeof request.headers["iq_tenant_id"] === "string"
          ? request.headers["iq_tenant_id"].trim()
          : typeof request.headers["x-tenant-id"] === "string"
            ? request.headers["x-tenant-id"].trim()
            : "";
      if (headerTenant.length > 0) {
        request.headers["iq_tenant_id"] = headerTenant;
        request.headers["x-tenant-id"] = headerTenant;
        return;
      }

      if (process.env["NODE_ENV"] !== "production" && process.env["AUTH_POLICY"] !== "required") {
        request.headers["iq_tenant_id"] = PHARMACY_DEV_TENANT_ID;
        request.headers["x-tenant-id"] = PHARMACY_DEV_TENANT_ID;
      }
    });

    await api.register(tenantPlugin);
    await api.register(authzPlugin, {
      cerbosUrl: CERBOS_URL,
      resolveTarget: createPharmacyAuthzTargetResolver(),
    });

    await api.register(
      createRouter({
        db,
        opdGateway,
        masterDataGateway,
        inventoryGateway,
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
