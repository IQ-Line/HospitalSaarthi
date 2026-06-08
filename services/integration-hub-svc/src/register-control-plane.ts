import type { FastifyInstance, FastifyRequest } from "fastify";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import type { DbInstance } from "@hims/ts-sdk-db";
import { validateAuthConfig, identityPlugin } from "@hims/ts-sdk-identity";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import {
  createControlPlaneRouter,
  createIntegrationAuthzTargetResolver,
} from "@hims/integration-hub";
import {
  DrizzleUserRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzlePrincipalAuthorizationRepository,
  createDefaultPrincipalService,
  principalRoleEnricherPlugin,
} from "@hims/user-management";

const CONTROL_PLANE_SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

export type RegisterControlPlaneOptions = {
  db: DbInstance;
  umDb: DbInstance;
  userManagementUrl: string;
  cerbosUrl: string;
  enableAuth: boolean;
  apiKeyEnvironment: "live" | "test";
};

function resolveActorId(request: FastifyRequest): string {
  const user = request.user as { id?: string } | undefined;
  if (user?.id && user.id.trim().length > 0) {
    return user.id.trim();
  }
  return CONTROL_PLANE_SYSTEM_ACTOR_ID;
}

function resolveAuthorization(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (typeof header === "string" && header.trim().length > 0) {
    return header.trim();
  }
  return "";
}

function resolveTenantId(request: FastifyRequest): string {
  const tenantId = (request as { tenantId?: string }).tenantId;
  if (typeof tenantId === "string" && tenantId.length > 0) {
    return tenantId;
  }
  throw new Error("tenantId missing on request — tenantPlugin must run first");
}

export async function registerControlPlane(
  app: FastifyInstance,
  options: RegisterControlPlaneOptions,
): Promise<void> {
  await assertCerbosReachable(options.cerbosUrl);

  const userRepository = new DrizzleUserRepository(options.umDb);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(
    options.umDb,
  );
  const principalAuthorizationRepository = new DrizzlePrincipalAuthorizationRepository(
    options.umDb,
  );
  const principalService = createDefaultPrincipalService({
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
  });

  const identityAuth = validateAuthConfig();
  const controlPlaneRouter = createControlPlaneRouter({
    db: options.db,
    userManagementUrl: options.userManagementUrl,
    apiKeyEnvironment: options.apiKeyEnvironment,
    getTenantId: resolveTenantId,
    getActorId: resolveActorId,
    getAuthorization: resolveAuthorization,
  });

  await app.register(async (api) => {
    if (options.enableAuth) {
      await api.register(identityPlugin, {
        ...identityAuth,
        skipPathPrefixes: ["/docs"],
      });
      // header-or-jwt: platform super-admin may scope requests to a tenant under Configurator.
      await api.register(tenantPlugin, { tenantSource: "header-or-jwt" });
      await api.register(principalRoleEnricherPlugin, {
        principalService,
        userRepository,
      });
      await api.register(authzPlugin, {
        cerbosUrl: options.cerbosUrl,
        resolveTarget: createIntegrationAuthzTargetResolver(),
      });
    } else {
      await api.register(tenantPlugin);
    }

    await api.register(controlPlaneRouter);
  }, { prefix: "/api/integration-hub/v1" });
}
