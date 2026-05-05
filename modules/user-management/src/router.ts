import type { FastifyInstance, FastifyRequest } from "fastify";
import { createInMemoryUserManagementDb } from "./data-access/in-memory-user-management-db.js";
import { DrizzleRoleAssignmentRepository } from "./data-access/role-assignment-repository.js";
import { DrizzleUserRepository, type UserManagementDb } from "./data-access/user-repository.js";
import { registerAuthHandlers } from "./http-handlers/auth-handlers.js";
import { registerRoleHandlers } from "./http-handlers/role-handlers.js";
import { registerUserHandlers } from "./http-handlers/user-handlers.js";
import type { AuthContext, EventPublisher, Principal, PrincipalService } from "./ports.js";

const STUB_TENANT_ID = "550e8400-e29b-41d4-a716-446655440001";
const STUB_USER_ID = "550e8400-e29b-41d4-a716-446655440002";

function createNoOpEventPublisher(): EventPublisher {
  return {
    async publishUserCreated() {},
    async publishRoleAssignmentChanged() {},
  };
}

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

/**
 * Registers User Management HTTP routes.
 * Omit `db` (or pass `undefined`) to use an in-memory stub; pass a Drizzle `UserManagementDb` for Postgres.
 */
export function registerUserManagementRoutes(fastify: FastifyInstance, db?: UserManagementDb): void {
  const resolvedDb = db ?? createInMemoryUserManagementDb();
  const userRepository = new DrizzleUserRepository(resolvedDb);
  const roleAssignmentRepository = new DrizzleRoleAssignmentRepository(resolvedDb);
  const eventPublisher = createNoOpEventPublisher();
  const principalService = createStubPrincipalService();

  const getTenantId = (_request: FastifyRequest) => STUB_TENANT_ID;
  const getUserId = (_request: FastifyRequest) => STUB_USER_ID;

  registerUserHandlers(fastify, {
    getTenantId,
    createUserDeps: { userRepository, eventPublisher },
    getUserDeps: { userRepository },
    updateUserDeps: { userRepository },
  });

  registerRoleHandlers(fastify, {
    getTenantId,
    assignRoleDeps: { roleAssignmentRepository, eventPublisher },
  });

  registerAuthHandlers(fastify, {
    getTenantId,
    getUserId,
    getUserDeps: { userRepository },
    getPrincipalDeps: { principalService },
  });
}
