import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DuplicateRoleAssignmentError } from "../domain/errors.js";
import type { AssignRoleInput } from "../ports.js";
import { assignRole } from "../use-cases/assign-role.js";
import type { AssignRoleDeps } from "../use-cases/assign-role.js";

export type RoleHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  assignRoleDeps: AssignRoleDeps;
};

function mapError(reply: FastifyReply, err: unknown) {
  if (err instanceof DuplicateRoleAssignmentError) {
    return reply.status(409).send({ message: err.message });
  }
  if (err instanceof Error) {
    return reply.status(400).send({ message: err.message });
  }
  return reply.status(400).send({ message: "Bad Request" });
}

export function registerRoleHandlers(fastify: FastifyInstance, deps: RoleHandlersDeps): void {
  fastify.post<{ Body: AssignRoleInput }>("/role-assignments", async (request, reply) => {
    const tenantId = deps.getTenantId(request);
    try {
      const assignment = await assignRole(deps.assignRoleDeps, tenantId, request.body);
      return reply.status(201).send(assignment);
    } catch (err) {
      return mapError(reply, err);
    }
  });
}
