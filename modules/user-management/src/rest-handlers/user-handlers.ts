import type { FastifyInstance, FastifyRequest } from "fastify";
import { forbidden } from "@hims/ts-sdk-http";
import { buildCerbosUserMgmtResourceAttr } from "../authz/cerbos-resource-attr.js";
import { UserNotFoundError } from "../domain/errors.js";
import { logRejectedNonEntitledCapabilityId } from "../http/log-rejected-non-entitled-capability.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import type {
  CreateUserInput,
  ReplaceUserCapabilitiesInput,
  UpdateUserInput,
} from "../ports/index.js";
import { createUser } from "../use-cases/create-user.js";
import type { CreateUserDeps } from "../use-cases/create-user.js";
import { applyRoleTemplate } from "../use-cases/apply-role-template.js";
import type { ApplyRoleTemplateDeps } from "../use-cases/apply-role-template.js";
import { detachRoleTemplate } from "../use-cases/detach-role-template.js";
import type { DetachRoleTemplateDeps } from "../use-cases/detach-role-template.js";
import { getUserCapabilities } from "../use-cases/get-user-capabilities.js";
import type { GetUserCapabilitiesDeps } from "../use-cases/get-user-capabilities.js";
import { getUserEffectiveCapabilities } from "../use-cases/get-user-effective-capabilities.js";
import type { GetUserEffectiveCapabilitiesDeps } from "../use-cases/get-user-effective-capabilities.js";
import { getUserById } from "../use-cases/get-user.js";
import type { GetUserDeps } from "../use-cases/get-user.js";
import { listUsersWithAuthz } from "../use-cases/list-users-with-authz.js";
import type { ListUsersWithAuthzDeps } from "../use-cases/list-users-with-authz.js";
import { listUserRoles } from "../use-cases/list-user-roles.js";
import type { ListUserRolesDeps } from "../use-cases/list-user-roles.js";
import { deactivateUser } from "../use-cases/deactivate-user.js";
import type { DeactivateUserDeps } from "../use-cases/deactivate-user.js";
import { activateUser } from "../use-cases/activate-user.js";
import type { ActivateUserDeps } from "../use-cases/activate-user.js";
import { replaceUserCapabilities } from "../use-cases/replace-user-capabilities.js";
import type { ReplaceUserCapabilitiesDeps } from "../use-cases/replace-user-capabilities.js";
import { updateUser } from "../use-cases/update-user.js";
import type { UpdateUserDeps } from "../use-cases/update-user.js";

export type UserHandlersDeps = {
  /** Tenant scope for persistence (typically JWT-derived via router). */
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  createUserDeps: CreateUserDeps;
  applyRoleTemplateDeps: ApplyRoleTemplateDeps;
  detachRoleTemplateDeps: DetachRoleTemplateDeps;
  getUserDeps: GetUserDeps;
  getUserCapabilitiesDeps: GetUserCapabilitiesDeps;
  getUserEffectiveCapabilitiesDeps: GetUserEffectiveCapabilitiesDeps;
  listUserRolesDeps: ListUserRolesDeps;
  listUsersAuthzDeps: ListUsersWithAuthzDeps;
  replaceUserCapabilitiesDeps: ReplaceUserCapabilitiesDeps;
  updateUserDeps: UpdateUserDeps;
  deactivateUserDeps: DeactivateUserDeps;
  activateUserDeps: ActivateUserDeps;
};

function tenantOnlyResourceAttr(tenantId: string) {
  return buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: tenantId,
    department: null,
    required_clearance: 0,
  });
}

async function ensureUserAccessMutationAllowed(
  request: FastifyRequest,
  reply: Parameters<typeof forbidden>[0],
  tenantId: string,
): Promise<boolean> {
  const result = await request.checkResource(
    "user_role_template",
    "new",
    "role.assign",
    tenantOnlyResourceAttr(tenantId),
  );
  if (!result.isAllowed("role.assign")) {
    await forbidden(reply, request, "AUTHZ_FORBIDDEN", "Forbidden");
    return false;
  }
  return true;
}

export function registerUserHandlers(fastify: FastifyInstance, deps: UserHandlersDeps): void {
  fastify.post<{ Body: CreateUserInput }>(
    "/users",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      const authorization = request.headers.authorization;
      try {
        const hasAccessMutation =
          (Array.isArray(request.body?.capability_ids) && request.body.capability_ids.length > 0) ||
          (Array.isArray(request.body?.role_template_ids) && request.body.role_template_ids.length > 0) ||
          (Array.isArray(request.body?.role_template_capability_ids) &&
            request.body.role_template_capability_ids.length > 0);
        if (hasAccessMutation) {
          const allowed = await ensureUserAccessMutationAllowed(request, reply, tenantId);
          if (!allowed) {
            return reply;
          }
        }
        const user = await createUser(
          deps.createUserDeps,
          { tenantId, actorId, correlationId: cid },
          request.body,
          { authorization: typeof authorization === "string" ? authorization : undefined },
        );
        return reply.status(201).send(user);
      } catch (err) {
        logRejectedNonEntitledCapabilityId(request.log, tenantId, err);
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/users/:id/capabilities",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      try {
        return reply.send(
          await getUserCapabilities(deps.getUserCapabilitiesDeps, tenantId, request.params.id),
        );
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.put<{ Params: { id: string }; Body: ReplaceUserCapabilitiesInput }>(
    "/users/:id/capabilities",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      const authorization = request.headers.authorization;
      try {
        const allowed = await ensureUserAccessMutationAllowed(request, reply, tenantId);
        if (!allowed) {
          return reply;
        }
        return reply.send(
          await replaceUserCapabilities(
            deps.replaceUserCapabilitiesDeps,
            { tenantId, actorId, correlationId: cid },
            request.params.id,
            request.body,
            { authorization: typeof authorization === "string" ? authorization : undefined },
          ),
        );
      } catch (err) {
        logRejectedNonEntitledCapabilityId(request.log, tenantId, err);
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/users/:id/effective-capabilities",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      try {
        return reply.send(
          await getUserEffectiveCapabilities(
            deps.getUserEffectiveCapabilitiesDeps,
            tenantId,
            request.params.id,
            typeof request.headers.authorization === "string"
              ? { authorization: request.headers.authorization }
              : undefined,
          ),
        );
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/users/:id/roles",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      try {
        return reply.send(await listUserRoles(deps.listUserRolesDeps, tenantId, request.params.id));
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.post<{
    Params: { id: string };
    Body: { role_id: string; role_template_capability_ids?: string[] };
  }>(
    "/users/:id/roles",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      const authorization = request.headers.authorization;
      try {
        const allowed = await ensureUserAccessMutationAllowed(request, reply, tenantId);
        if (!allowed) {
          return reply;
        }
        const applied = await applyRoleTemplate(
          deps.applyRoleTemplateDeps,
          { tenantId, actorId, correlationId: cid },
          {
            user_id: request.params.id,
            role_id: request.body.role_id,
            ...(request.body.role_template_capability_ids !== undefined
              ? { role_template_capability_ids: request.body.role_template_capability_ids }
              : {}),
          },
          { authorization: typeof authorization === "string" ? authorization : undefined },
        );
        return reply.status(201).send(applied);
      } catch (err) {
        logRejectedNonEntitledCapabilityId(request.log, tenantId, err);
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.delete<{ Params: { id: string; roleId: string } }>(
    "/users/:id/roles/:roleId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      try {
        const allowed = await ensureUserAccessMutationAllowed(request, reply, tenantId);
        if (!allowed) {
          return reply;
        }
        return reply.send(
          await detachRoleTemplate(
            deps.detachRoleTemplateDeps,
            { tenantId, actorId, correlationId: cid },
            { user_id: request.params.id, role_id: request.params.roleId },
          ),
        );
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get<{ Querystring: { department?: string } }>(
    "/providers",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const department = request.query.department?.trim() || undefined;
      const users = await deps.listUsersAuthzDeps.userRepository.listUsers(
        tenantId,
        department ? { department } : undefined,
      );
      return reply.send(
        users
          .filter((u) => u.status === "active")
          .map((u) => ({
            id: u.id,
            full_name: u.full_name,
            department: u.department ?? null,
            status: u.status,
          })),
      );
    },
  );

  fastify.get<{ Querystring: { department?: string } }>(
    "/users",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      const department = request.query.department?.trim() || undefined;
      try {
        const users = await listUsersWithAuthz(
          request,
          deps.listUsersAuthzDeps,
          tenantId,
          department ? { department } : undefined,
        );
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

  fastify.post<{ Params: { id: string } }>(
    "/users/:id/activate",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      try {
        const user = await activateUser(
          deps.activateUserDeps,
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
