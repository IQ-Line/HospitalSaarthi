import type { FastifyInstance, FastifyRequest } from "fastify";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import { ValidationError } from "../domain/errors.js";
import type { AssignRoleInput } from "../ports/index.js";
import { assignRole } from "../use-cases/assign-role.js";
import type { AssignRoleDeps } from "../use-cases/assign-role.js";
import { revokeRole } from "../use-cases/revoke-role.js";
import type { RevokeRoleDeps } from "../use-cases/revoke-role.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RoleHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  assignRoleDeps: AssignRoleDeps;
  revokeRoleDeps: RevokeRoleDeps;
};

export function registerRoleHandlers(fastify: FastifyInstance, deps: RoleHandlersDeps): void {
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
