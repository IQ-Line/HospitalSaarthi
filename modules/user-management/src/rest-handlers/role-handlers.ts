import type { FastifyInstance, FastifyRequest } from "fastify";
import { CapabilityNotFoundError, RoleNotFoundError } from "../domain/errors.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import { ValidationError } from "../domain/errors.js";
import type {
  AssignRoleInput,
  CreateRoleInput,
  ReplaceRoleCapabilitiesInput,
  UpdateRoleInput,
} from "../ports/index.js";
import { assignRole } from "../use-cases/assign-role.js";
import type { AssignRoleDeps } from "../use-cases/assign-role.js";
import { createRole } from "../use-cases/create-role.js";
import type { CreateRoleDeps } from "../use-cases/create-role.js";
import { deleteRole } from "../use-cases/delete-role.js";
import type { DeleteRoleDeps } from "../use-cases/delete-role.js";
import { getRoleCapabilities } from "../use-cases/get-role-capabilities.js";
import type { GetRoleCapabilitiesDeps } from "../use-cases/get-role-capabilities.js";
import { getCapabilityById } from "../use-cases/get-capability.js";
import type { GetCapabilityDeps } from "../use-cases/get-capability.js";
import { getRoleById } from "../use-cases/get-role.js";
import type { GetRoleDeps } from "../use-cases/get-role.js";
import { listCapabilities } from "../use-cases/list-capabilities.js";
import type { ListCapabilitiesDeps } from "../use-cases/list-capabilities.js";
import { listRoleAssignments } from "../use-cases/list-role-assignments.js";
import type { ListRoleAssignmentsDeps } from "../use-cases/list-role-assignments.js";
import { listRoles } from "../use-cases/list-roles.js";
import type { ListRolesDeps } from "../use-cases/list-roles.js";
import { listUserRoles } from "../use-cases/list-user-roles.js";
import type { ListUserRolesDeps } from "../use-cases/list-user-roles.js";
import { replaceRoleCapabilities } from "../use-cases/replace-role-capabilities.js";
import type { ReplaceRoleCapabilitiesDeps } from "../use-cases/replace-role-capabilities.js";
import { revokeRole } from "../use-cases/revoke-role.js";
import type { RevokeRoleDeps } from "../use-cases/revoke-role.js";
import { updateRole } from "../use-cases/update-role.js";
import type { UpdateRoleDeps } from "../use-cases/update-role.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RoleHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  listCapabilitiesDeps: ListCapabilitiesDeps;
  getCapabilityDeps: GetCapabilityDeps;
  listRolesDeps: ListRolesDeps;
  createRoleDeps: CreateRoleDeps;
  getRoleDeps: GetRoleDeps;
  updateRoleDeps: UpdateRoleDeps;
  deleteRoleDeps: DeleteRoleDeps;
  getRoleCapabilitiesDeps: GetRoleCapabilitiesDeps;
  replaceRoleCapabilitiesDeps: ReplaceRoleCapabilitiesDeps;
  listRoleAssignmentsDeps: ListRoleAssignmentsDeps;
  listUserRolesDeps: ListUserRolesDeps;
  assignRoleDeps: AssignRoleDeps;
  revokeRoleDeps: RevokeRoleDeps;
};

function requireUuidRouteId(id: string): string {
  if (!UUID_RE.test(id)) {
    throw new ValidationError("route_id_invalid");
  }
  return id;
}

export function registerRoleHandlers(fastify: FastifyInstance, deps: RoleHandlersDeps): void {
  fastify.get(
    "/capabilities",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        return reply.send(await listCapabilities(deps.listCapabilitiesDeps));
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/capabilities/:id",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        const capabilityId = requireUuidRouteId(request.params.id);
        const capability = await getCapabilityById(deps.getCapabilityDeps, capabilityId);
        if (capability === null) {
          return replyWithUserManagementError(reply, new CapabilityNotFoundError(capabilityId), cid);
        }
        return reply.send(capability);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get(
    "/roles",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      try {
        return reply.send(await listRoles(deps.listRolesDeps, tenantId));
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.post<{ Body: CreateRoleInput }>(
    "/roles",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      try {
        const role = await createRole(deps.createRoleDeps, { tenantId, actorId, correlationId: cid }, request.body);
        return reply.status(201).send(role);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/roles/:id",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        const tenantId = deps.getTenantId(request);
        const roleId = requireUuidRouteId(request.params.id);
        const role = await getRoleById(deps.getRoleDeps, tenantId, roleId);
        if (role === null) {
          return replyWithUserManagementError(reply, new RoleNotFoundError(roleId), cid);
        }
        return reply.send(role);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.patch<{ Params: { id: string }; Body: UpdateRoleInput }>(
    "/roles/:id",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        const tenantId = deps.getTenantId(request);
        const roleId = requireUuidRouteId(request.params.id);
        const role = await updateRole(deps.updateRoleDeps, tenantId, roleId, request.body);
        if (role === null) {
          return replyWithUserManagementError(reply, new RoleNotFoundError(roleId), cid);
        }
        return reply.send(role);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/roles/:id",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        const tenantId = deps.getTenantId(request);
        const roleId = requireUuidRouteId(request.params.id);
        const role = await deleteRole(deps.deleteRoleDeps, tenantId, roleId);
        if (role === null) {
          return replyWithUserManagementError(reply, new RoleNotFoundError(roleId), cid);
        }
        return reply.send(role);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/roles/:id/capabilities",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        const tenantId = deps.getTenantId(request);
        const roleId = requireUuidRouteId(request.params.id);
        return reply.send(await getRoleCapabilities(deps.getRoleCapabilitiesDeps, tenantId, roleId));
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.put<{ Params: { id: string }; Body: ReplaceRoleCapabilitiesInput }>(
    "/roles/:id/capabilities",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        const tenantId = deps.getTenantId(request);
        const roleId = requireUuidRouteId(request.params.id);
        return reply.send(
          await replaceRoleCapabilities(
            deps.replaceRoleCapabilitiesDeps,
            tenantId,
            roleId,
            request.body,
          ),
        );
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get(
    "/role-assignments",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      const q = request.query as Record<string, unknown>;
      const userId = typeof q["user_id"] === "string" ? q["user_id"].trim() : undefined;
      const roleId = typeof q["role_id"] === "string" ? q["role_id"].trim() : undefined;
      if ((userId && !UUID_RE.test(userId)) || (roleId && !UUID_RE.test(roleId))) {
        return replyWithUserManagementError(reply, new ValidationError("revoke_role_query_invalid"), cid);
      }
      try {
        return reply.send(
          await listRoleAssignments(deps.listRoleAssignmentsDeps, tenantId, {
            ...(userId ? { userId } : {}),
            ...(roleId ? { roleId } : {}),
          }),
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
      const cid = request.correlationId ?? request.id;
      try {
        const tenantId = deps.getTenantId(request);
        const userId = requireUuidRouteId(request.params.id);
        return reply.send(await listUserRoles(deps.listUserRolesDeps, tenantId, userId));
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.post<{ Body: AssignRoleInput }>(
    "/role-assignments",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      try {
        const assignment = await assignRole(
          deps.assignRoleDeps,
          { tenantId, actorId, correlationId: cid },
          request.body,
        );
        return reply.status(201).send(assignment);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.delete(
    "/role-assignments",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const cid = request.correlationId ?? request.id;
      const q = request.query as Record<string, unknown>;
      const userId = typeof q["user_id"] === "string" ? q["user_id"].trim() : "";
      const roleId = typeof q["role_id"] === "string" ? q["role_id"].trim() : "";
      if (!UUID_RE.test(userId) || !UUID_RE.test(roleId)) {
        return replyWithUserManagementError(reply, new ValidationError("revoke_role_query_invalid"), cid);
      }
      try {
        const revoked = await revokeRole(
          deps.revokeRoleDeps,
          { tenantId, actorId, correlationId: cid },
          { user_id: userId, role_id: roleId },
        );
        return reply.send(revoked);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );
}
