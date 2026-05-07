/// <reference types="@fastify/sensible" />
import type { EventBus } from "@hims/ts-sdk-events";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type {
  AuthContext,
  Principal,
  PrincipalService,
  RoleAssignmentRepository,
  UserRepository,
} from "./ports/index.js";
import { registerAuthHandlers } from "./rest-handlers/auth-handlers.js";
import { registerRoleHandlers } from "./rest-handlers/role-handlers.js";
import { registerUserHandlers } from "./rest-handlers/user-handlers.js";

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

function extractRolesFromRequestUser(user: unknown): string[] {
  if (user == null || typeof user !== "object") return [];
  const raw = (user as Record<string, unknown>)["roles"];
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is string => typeof r === "string");
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
function createStubPrincipalService(): PrincipalService {
  return {
    async getPrincipal(context: AuthContext): Promise<Principal> {
      const requestUser = context.requestUser;
      const roles = extractRolesFromRequestUser(requestUser);
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
  roleAssignmentRepository: RoleAssignmentRepository;
  eventBus: EventBus;
  getTenantId?: (request: FastifyRequest) => string;
  getUserId?: (request: FastifyRequest) => string;
}

const userManagementPluginImpl: FastifyPluginAsync<UserManagementPluginOptions> = async (
  fastify,
  options,
) => {
  const { userRepository, roleAssignmentRepository, eventBus } = options;
  const principalService = createStubPrincipalService();

  const getTenantId = options.getTenantId ?? defaultGetTenantId;
  const getUserId = options.getUserId ?? defaultGetUserId;
  const getActorId = getUserId;

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
    assignRoleDeps: { roleAssignmentRepository, eventBus },
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
