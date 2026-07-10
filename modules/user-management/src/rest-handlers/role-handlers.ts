import type { FastifyInstance, FastifyRequest } from "fastify";
import { CapabilityNotFoundError, RoleNotFoundError, ValidationError } from "../domain/errors.js";
import { logRejectedNonEntitledCapabilityId } from "../http/log-rejected-non-entitled-capability.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import type {
  CreateRoleInput,
  ReplaceRoleCapabilitiesInput,
  UpdateRoleInput,
} from "../ports/index.js";
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
import { listAssignableRuntimeCapabilities } from "../use-cases/list-assignable-runtime-capabilities.js";
import type { ListAssignableRuntimeCapabilitiesDeps } from "../use-cases/list-assignable-runtime-capabilities.js";
import { listCapabilities } from "../use-cases/list-capabilities.js";
import type { ListCapabilitiesDeps } from "../use-cases/list-capabilities.js";
import { listRoles } from "../use-cases/list-roles.js";
import type { ListRolesDeps } from "../use-cases/list-roles.js";
import { replaceRoleCapabilities } from "../use-cases/replace-role-capabilities.js";
import type { ReplaceRoleCapabilitiesDeps } from "../use-cases/replace-role-capabilities.js";
import { updateRole } from "../use-cases/update-role.js";
import type { UpdateRoleDeps } from "../use-cases/update-role.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RoleHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  /** True only for the platform super-admin — gates the platform-controlled `is_system` flag. */
  getCanManageSystemFlag: (request: FastifyRequest) => boolean;
  listCapabilitiesDeps: ListCapabilitiesDeps;
  listAssignableRuntimeCapabilitiesDeps: ListAssignableRuntimeCapabilitiesDeps;
  getCapabilityDeps: GetCapabilityDeps;
  listRolesDeps: ListRolesDeps;
  createRoleDeps: CreateRoleDeps;
  getRoleDeps: GetRoleDeps;
  updateRoleDeps: UpdateRoleDeps;
  deleteRoleDeps: DeleteRoleDeps;
  getRoleCapabilitiesDeps: GetRoleCapabilitiesDeps;
  replaceRoleCapabilitiesDeps: ReplaceRoleCapabilitiesDeps;
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

  fastify.get<{ Querystring: { product_only?: string } }>(
    "/capabilities/assignable",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      const authorization = request.headers.authorization;
      const productOnly = request.query.product_only === "true";
      try {
        return reply.send(
          await listAssignableRuntimeCapabilities(
            deps.listAssignableRuntimeCapabilitiesDeps,
            tenantId,
            { authorization: typeof authorization === "string" ? authorization : undefined },
            { productOnly },
          ),
        );
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
      const canManageSystemFlag = deps.getCanManageSystemFlag(request);
      const cid = request.correlationId ?? request.id;
      try {
        const role = await createRole(
          deps.createRoleDeps,
          { tenantId, actorId, correlationId: cid, canManageSystemFlag },
          request.body,
        );
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
        const canManageSystemFlag = deps.getCanManageSystemFlag(request);
        const role = await updateRole(
          deps.updateRoleDeps,
          tenantId,
          roleId,
          request.body,
          canManageSystemFlag,
        );
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
      const tenantId = deps.getTenantId(request);
      const authorization = request.headers.authorization;
      try {
        const roleId = requireUuidRouteId(request.params.id);
        return reply.send(
          await replaceRoleCapabilities(
            deps.replaceRoleCapabilitiesDeps,
            tenantId,
            roleId,
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

}
