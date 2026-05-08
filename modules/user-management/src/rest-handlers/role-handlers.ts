import type { FastifyInstance, FastifyRequest } from "fastify";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import type { AssignRoleInput } from "../ports/index.js";
import { assignRole } from "../use-cases/assign-role.js";
import type { AssignRoleDeps } from "../use-cases/assign-role.js";

export type RoleHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  assignRoleDeps: AssignRoleDeps;
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
}
