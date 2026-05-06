import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DuplicateRoleAssignmentError } from "../domain/errors.js";
import type { AssignRoleInput } from "../ports/index.js";
import { assignRole } from "../use-cases/assign-role.js";
import type { AssignRoleDeps } from "../use-cases/assign-role.js";

export type RoleHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
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
    const actorId = deps.getActorId(request);
    const correlationId = randomUUID();
    try {
      const assignment = await assignRole(
        deps.assignRoleDeps,
        { tenantId, actorId, correlationId },
        request.body,
      );
      return reply.status(201).send(assignment);
    } catch (err) {
      return mapError(reply, err);
    }
  });
}
