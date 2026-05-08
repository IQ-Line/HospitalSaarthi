/// <reference types="@fastify/sensible" />
import type { EventBus } from "@hims/ts-sdk-events";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type {
  AuthContext,
  Principal,
  PrincipalRoleProjectionRepository,
  RoleRepository,
  PrincipalService,
  RoleAssignmentRepository,
  UserRepository,
} from "./ports/index.js";
import { TenantMismatchError } from "./domain/errors.js";
import { replyWithUserManagementError } from "./http/map-user-management-error.js";
import { registerAuthHandlers } from "./rest-handlers/auth-handlers.js";
import { registerRoleHandlers } from "./rest-handlers/role-handlers.js";
import { registerUserHandlers } from "./rest-handlers/user-handlers.js";
import { validateRbacIntegrity } from "./use-cases/validate-rbac-integrity.js";
import { projectPrincipalRoles } from "./use-cases/project-principal-roles.js";

type RequestWithOptionalUser = FastifyRequest & { user?: unknown };

function pickNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Resolves tenant from identity (`iq_tenant_id` claim) or SDK Principal (`tenantId`). */
function resolveTenantIdFromRequestUser(user: unknown): string {
  return (user as { tenantId: string }).tenantId;
}

/** Resolves user id from identity (`sub` claim) or SDK Principal (`userId`). */
function resolveUserIdFromRequestUser(user: unknown): string | undefined {
  if (user == null || typeof user !== "object") return undefined;
  const u = user as Record<string, unknown>;
  return pickNonEmptyString(u["sub"]) ?? pickNonEmptyString(u["userId"]);
}

/** JWT `org_id` or SDK-normalized `orgId` on `request.user`. */
function extractOrgIdFromRequestUser(user: unknown): string | null {
  if (user == null || typeof user !== "object") return null;
  const u = user as Record<string, unknown>;
  return pickNonEmptyString(u["org_id"]) ?? pickNonEmptyString(u["orgId"]) ?? null;
}

function defaultGetTenantId(request: FastifyRequest): string {
  return resolveTenantIdFromRequestUser((request as RequestWithOptionalUser).user);
}

function defaultGetUserId(request: FastifyRequest): string {
  const user = (request as RequestWithOptionalUser).user;
  if (user == null || typeof user !== "object") throw request.server.httpErrors.unauthorized();
  const userId = resolveUserIdFromRequestUser(user);
  if (userId === undefined) throw request.server.httpErrors.unauthorized();
  return userId;
}

/** Minimal PEP stub until PrincipalService is implemented with real enrichment. */
function createStubPrincipalService(
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository,
): PrincipalService {
  return {
    async getPrincipal(context: AuthContext): Promise<Principal> {
      const requestUser = context.requestUser;
      const roles = await projectPrincipalRoles(
        {
          principalRoleProjectionRepository,
        },
        context.tenantId,
        context.userId,
      );
      const orgId = extractOrgIdFromRequestUser(requestUser);

      return {
        id: context.userId,
        roles,
        attributes: {
          iq_tenant_id: context.tenantId,
          department: null,
          org_id: orgId,
          capabilities: [],
          delegated_capabilities: [],
          clearances: {},
        },
      };
    },
  };
}

export interface UserManagementPluginOptions {
  userRepository: UserRepository;
  roleRepository: RoleRepository;
  roleAssignmentRepository: RoleAssignmentRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  eventBus: EventBus;
  getTenantId?: (request: FastifyRequest) => string;
  getUserId?: (request: FastifyRequest) => string;
}

const userManagementPluginImpl: FastifyPluginAsync<UserManagementPluginOptions> = async (
  fastify,
  options,
) => {
  const {
    userRepository,
    roleRepository,
    roleAssignmentRepository,
    principalRoleProjectionRepository,
    eventBus,
  } = options;
  const principalService = createStubPrincipalService(principalRoleProjectionRepository);

  const getTenantId = options.getTenantId ?? defaultGetTenantId;
  const getUserId = options.getUserId ?? defaultGetUserId;
  const getActorId = getUserId;

  fastify.addHook("preHandler", async (request, reply) => {
    const headerTenant = request.headers["iq_tenant_id"];
    if (typeof headerTenant !== "string" || headerTenant.length === 0) {
      return;
    }

    const tokenTenant = getTenantId(request);
    if (headerTenant !== tokenTenant) {
      return replyWithUserManagementError(
        reply,
        new TenantMismatchError(),
        request.correlationId ?? request.id,
      );
    }
  });

  await validateRbacIntegrity({
    userRepository,
    roleRepository,
    roleAssignmentRepository,
  });

  registerUserHandlers(fastify, {
    getTenantId,
    getActorId,
    createUserDeps: { userRepository, eventBus },
    getUserDeps: { userRepository },
    updateUserDeps: { userRepository, eventBus },
  });

  registerRoleHandlers(fastify, {
    getTenantId,
    getActorId,
    assignRoleDeps: { userRepository, roleRepository, roleAssignmentRepository, eventBus },
  });

  registerAuthHandlers(fastify, {
    getTenantId,
    getUserId,
    getUserDeps: { userRepository },
    getPrincipalDeps: { principalService },
  });
};

export const userManagementPlugin = fp(userManagementPluginImpl, {
  fastify: "5.x",
  name: "@hims/user-management",
});
