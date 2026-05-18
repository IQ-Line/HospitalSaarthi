/// <reference types="@fastify/sensible" />
import type { EventBus } from "@hims/ts-sdk-events";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type {
  AuthAccountProvisioner,
  CapabilityRepository,
  PrincipalRoleProjectionRepository,
  RoleCapabilityRepository,
  RoleRepository,
  RoleAssignmentRepository,
  UserRepository,
} from "./ports/index.js";
import { TenantMismatchError } from "./domain/errors.js";
import { replyWithUserManagementError } from "./http/map-user-management-error.js";
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

export interface UserManagementPluginOptions {
  userRepository: UserRepository;
  capabilityRepository: CapabilityRepository;
  roleRepository: RoleRepository;
  roleCapabilityRepository: RoleCapabilityRepository;
  roleAssignmentRepository: RoleAssignmentRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  authAccountProvisioner: AuthAccountProvisioner;
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
    capabilityRepository,
    roleRepository,
    roleCapabilityRepository,
    roleAssignmentRepository,
    principalRoleProjectionRepository,
    authAccountProvisioner,
    eventBus,
  } = options;

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

  registerUserHandlers(fastify, {
    getTenantId,
    getActorId,
    createUserDeps: {
      userRepository,
      roleRepository,
      roleAssignmentRepository,
      principalRoleProjectionRepository,
      authAccountProvisioner,
      eventBus,
    },
    getUserDeps: { userRepository },
    listUsersAuthzDeps: { userRepository },
    updateUserDeps: { userRepository, eventBus },
    deactivateUserDeps: { userRepository, eventBus },
  });

  registerRoleHandlers(fastify, {
    getTenantId,
    getActorId,
    listCapabilitiesDeps: { capabilityRepository },
    getCapabilityDeps: { capabilityRepository },
    listRolesDeps: { roleRepository },
    createRoleDeps: { roleRepository, eventBus },
    getRoleDeps: { roleRepository },
    updateRoleDeps: { roleRepository },
    deleteRoleDeps: { roleRepository },
    getRoleCapabilitiesDeps: { roleRepository, roleCapabilityRepository },
    replaceRoleCapabilitiesDeps: { roleRepository, capabilityRepository, roleCapabilityRepository },
    listRoleAssignmentsDeps: { roleAssignmentRepository },
    listUserRolesDeps: { userRepository, roleAssignmentRepository, roleRepository },
    assignRoleDeps: { userRepository, roleRepository, roleAssignmentRepository, eventBus },
    revokeRoleDeps: { userRepository, roleRepository, roleAssignmentRepository, eventBus },
  });

  registerAuthHandlers(fastify, {
    getTenantId,
    getUserId,
    getUserDeps: { userRepository },
    uxPermissionMapDeps: {
      userRepository,
      getTenantId,
      getUserId,
    },
  });
};

export const userManagementPlugin = fp(userManagementPluginImpl, {
  fastify: "5.x",
  name: "@hims/user-management",
});
