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
  applyInventorySchemaMigration,
  createInventoryAuthzTargetResolver,
  createRouter,
  HttpMasterDataGateway,
} from "@hims/inventory";

const PORT = Number(process.env["INVENTORY_SVC_PORT"] ?? 3008);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const CERBOS_URL = process.env["CERBOS_URL"];
const MASTER_DATA_URL = process.env["MASTER_DATA_URL"] ?? "http://localhost:8010";
const INVENTORY_DEV_TENANT_ID =
  process.env["INVENTORY_DEV_TENANT_ID"] ?? "f47ac10b-58cc-4372-a567-0e02b2c3d480";

async function main() {
  if (!CERBOS_URL) {
    throw new Error("CERBOS_URL environment variable is required");
  }

  const app = Fastify({ logger: true });

  await registerOpenApiDocs(app, {
    serviceId: "inventory",
    title: "Inventory API",
    version: "1.0.0",
    description: "Inventory module HTTP surface (stores, items, GRN, stock, indents).",
    apiPrefix: "/api/inventory/v1",
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  if (!DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required for inventory-svc");
  }

  if (process.env["INVENTORY_SKIP_MIGRATE"] !== "true") {
    await applyInventorySchemaMigration(DATABASE_URL);
    app.log.info("Inventory schema migration applied (or already up to date)");
  }

  const db = createDb(DATABASE_URL);
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

  await assertCerbosReachable(CERBOS_URL);

  await app.register(async (api) => {
    await api.register(identityPlugin, {
      ...identityAuth,
      skipPathPrefixes: ["/docs"],
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
        request.headers["iq_tenant_id"] = INVENTORY_DEV_TENANT_ID;
        request.headers["x-tenant-id"] = INVENTORY_DEV_TENANT_ID;
      }
    });

    await api.register(tenantPlugin);
    await api.register(authzPlugin, {
      cerbosUrl: CERBOS_URL,
      resolveTarget: createInventoryAuthzTargetResolver(),
    });

    await api.register(
      createRouter({
        db,
        masterDataGateway,
      }),
    );
  }, { prefix: "/api/inventory/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
