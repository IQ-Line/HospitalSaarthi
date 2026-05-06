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

const STUB_TENANT_ID = "550e8400-e29b-41d4-a716-446655440001";
const STUB_USER_ID = "550e8400-e29b-41d4-a716-446655440002";

/** Minimal PEP stub until PrincipalService is implemented with real enrichment. */
function createStubPrincipalService(): PrincipalService {
  return {
    async getPrincipal(context: AuthContext): Promise<Principal> {
      return {
        id: context.userId,
        roles: [],
        attributes: {
          iq_tenant_id: context.tenantId,
          department: null,
          org_id: null,
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

  const getTenantId = options.getTenantId ?? ((_request: FastifyRequest) => STUB_TENANT_ID);
  const getUserId = options.getUserId ?? ((_request: FastifyRequest) => STUB_USER_ID);
  const getActorId = getUserId;

  registerUserHandlers(fastify, {
    getTenantId,
    getActorId,
    createUserDeps: { userRepository, eventBus },
    getUserDeps: { userRepository },
    updateUserDeps: { userRepository },
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
