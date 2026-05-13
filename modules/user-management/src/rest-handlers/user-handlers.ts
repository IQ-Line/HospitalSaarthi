import type { FastifyInstance, FastifyRequest } from "fastify";
import { forbidden } from "@hims/ts-sdk-http";
import { buildCerbosUserMgmtResourceAttr } from "../authz/cerbos-resource-attr.js";
import { UserNotFoundError } from "../domain/errors.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import type { CreateUserInput, UpdateUserInput } from "../ports/index.js";
import { createUser } from "../use-cases/create-user.js";
import type { CreateUserDeps } from "../use-cases/create-user.js";
import { getUserById } from "../use-cases/get-user.js";
import type { GetUserDeps } from "../use-cases/get-user.js";
import { listUsersWithAuthz } from "../use-cases/list-users-with-authz.js";
import type { ListUsersWithAuthzDeps } from "../use-cases/list-users-with-authz.js";
import { deactivateUser } from "../use-cases/deactivate-user.js";
import type { DeactivateUserDeps } from "../use-cases/deactivate-user.js";
import { updateUser } from "../use-cases/update-user.js";
import type { UpdateUserDeps } from "../use-cases/update-user.js";

export type UserHandlersDeps = {
  /** Tenant scope for persistence (typically JWT-derived via router). */
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  createUserDeps: CreateUserDeps;
  getUserDeps: GetUserDeps;
  listUsersAuthzDeps: ListUsersWithAuthzDeps;
  updateUserDeps: UpdateUserDeps;
  deactivateUserDeps: DeactivateUserDeps;
};

function tenantOnlyResourceAttr(tenantId: string) {
  return buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: tenantId,
    department: null,
    required_clearance: 0,
  });
}

export function registerUserHandlers(fastify: FastifyInstance, deps: UserHandlersDeps): void {
  fastify.post<{ Body: CreateUserInput }>(
    "/users",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      try {
        if (Array.isArray(request.body?.role_ids) && request.body.role_ids.length > 0) {
          const result = await request.checkResource(
            "role_assignment",
            "new",
            "role.assign",
            tenantOnlyResourceAttr(tenantId),
          );
          if (!result.isAllowed("role.assign")) {
            return forbidden(reply, request, "AUTHZ_FORBIDDEN", "Forbidden");
          }
        }
        const user = await createUser(
          deps.createUserDeps,
          { tenantId, actorId, correlationId: cid },
          request.body,
        );
        return reply.status(201).send(user);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get(
    "/users",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      try {
        const users = await listUsersWithAuthz(request, deps.listUsersAuthzDeps, tenantId);
        return reply.send(users);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/users/:id/deactivate",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      try {
        const user = await deactivateUser(
          deps.deactivateUserDeps,
          { tenantId, actorId, correlationId: cid },
          request.params.id,
        );
        if (user === null) {
          return replyWithUserManagementError(reply, new UserNotFoundError(request.params.id), cid);
        }
        return reply.send(user);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/users/:id",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      const user = await getUserById(deps.getUserDeps, tenantId, request.params.id);
      if (user === null) {
        return replyWithUserManagementError(reply, new UserNotFoundError(request.params.id), cid);
      }
      return reply.send(user);
    },
  );

  fastify.patch<{ Params: { id: string }; Body: UpdateUserInput }>(
    "/users/:id",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      try {
        const user = await updateUser(
          deps.updateUserDeps,
          { tenantId, actorId, correlationId: cid },
          request.params.id,
          request.body ?? {},
        );
        if (user === null) {
          return replyWithUserManagementError(reply, new UserNotFoundError(request.params.id), cid);
        }
        return reply.send(user);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );
}
