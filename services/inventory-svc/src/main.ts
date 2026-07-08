import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { registerProblemErrorHandler } from "@hims/ts-sdk-errors";
import { correlationIdPlugin } from "@hims/ts-sdk-observability";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { validateAuthConfig, identityPlugin } from "@hims/ts-sdk-identity";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import {
  DrizzleUserRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzlePrincipalAuthorizationRepository,
  DrizzleCapabilityRepository,
  createPepRuntimeAuthFromUrls,
  requirePepUpstreamBaseUrl,
  principalRoleEnricherPlugin,
} from "@hims/user-management";
import {
  applyInventorySchemaMigration,
  createRouter,
  createInventoryAuthzTargetResolver,
  enforcePrincipalTenant,
  HttpMasterDataGateway,
} from "@hims/inventory";

const PORT = Number(process.env["INVENTORY_SVC_PORT"] ?? 3008);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const CERBOS_URL = process.env["CERBOS_URL"];
const MASTER_DATA_URL = process.env["MASTER_DATA_URL"] ?? "http://localhost:8010";

async function main() {
  const app = Fastify({ logger: true });
  try {
    await boot(app);
  } catch (err) {
    app.log.fatal({ err }, "Failed to start inventory-svc");
    process.exit(1);
  }
}

async function boot(app: FastifyInstance): Promise<void> {
  // Correlation id first (app root): every route gets an id bound to request.log
  // and echoed on the response header.
  await app.register(correlationIdPlugin);
  // RFC 7807 problem+json for every error; inherited by all child scopes.
  registerProblemErrorHandler(app);

  if (!CERBOS_URL) {
    throw new Error("CERBOS_URL environment variable is required");
  }

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
  const inventoryRouter = createRouter({ db, masterDataGateway });

  const identityAuth = validateAuthConfig();

  // PEP principal enrichment: capabilities + role codes for the Cerbos principal.
  const userRepository = new DrizzleUserRepository(db);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(db);
  const principalAuthorizationRepository = new DrizzlePrincipalAuthorizationRepository(db);
  const capabilityRepository = new DrizzleCapabilityRepository(db);

  const configuratorUrl = requirePepUpstreamBaseUrl("CONFIGURATOR_URL");
  const masterDataUrl = requirePepUpstreamBaseUrl("MASTER_DATA_URL");

  const { principalService } = createPepRuntimeAuthFromUrls({
    configuratorUrl,
    masterDataUrl,
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
    capabilityRepository,
    log: (event, message) => app.log.info(event, message),
  });

  // Fail fast if the PDP is unreachable — CERBOS_URL is now actually consumed
  // (assertCerbosReachable + authzPlugin), not required-then-ignored.
  await assertCerbosReachable(CERBOS_URL);

  await app.register(
    async (api) => {
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
        resolveTarget: createInventoryAuthzTargetResolver(),
      });
      // Pin the tenant to the verified principal (ignoring any client tenant header)
      // BEFORE tenantPlugin consumes the header — defeats tenant-header spoofing and
      // removes the old client-trust + hardcoded-dev-UUID injection.
      api.addHook("onRequest", enforcePrincipalTenant);
      await api.register(tenantPlugin);
      await api.register(multipart, {
        limits: {
          fileSize: 10 * 1024 * 1024,
          files: 1,
        },
      });
      await api.register(inventoryRouter);
    },
    { prefix: "/api/inventory/v1" },
  );

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`inventory-svc listening on port ${PORT}`);
}

main().catch((error: unknown) => {
  // Only reached if Fastify construction itself failed — no logger can exist yet.
  console.error("Failed to start inventory-svc:", error);
  process.exit(1);
});
