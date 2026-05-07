import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { CreateUserInput, UpdateUserInput } from "../ports/index.js";
import { createUser } from "../use-cases/create-user.js";
import type { CreateUserDeps } from "../use-cases/create-user.js";
import { getUserById } from "../use-cases/get-user.js";
import type { GetUserDeps } from "../use-cases/get-user.js";
import { updateUser } from "../use-cases/update-user.js";
import type { UpdateUserDeps } from "../use-cases/update-user.js";

export type UserHandlersDeps = {
  /** Tenant scope for persistence (typically JWT-derived via router). */
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  createUserDeps: CreateUserDeps;
  getUserDeps: GetUserDeps;
  updateUserDeps: UpdateUserDeps;
};

function mapError(reply: FastifyReply, err: unknown) {
  if (err instanceof Error) {
    return reply.status(400).send({ message: err.message });
  }
  return reply.status(400).send({ message: "Bad Request" });
}

export function registerUserHandlers(fastify: FastifyInstance, deps: UserHandlersDeps): void {
  fastify.post<{ Body: CreateUserInput }>("/users", async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const actorId = deps.getActorId(request);
      const correlationId = randomUUID();
      try {
        const user = await createUser(
          deps.createUserDeps,
          { tenantId, actorId, correlationId },
          request.body,
        );
        return reply.status(201).send(user);
      } catch (err) {
        return mapError(reply, err);
      }
  });

  fastify.get<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const user = await getUserById(deps.getUserDeps, tenantId, request.params.id);
      if (!user) {
        return reply.status(404).send({ message: "User not found for this tenant." });
      }
      return reply.send(user);
  });

  fastify.patch<{ Params: { id: string }; Body: UpdateUserInput }>("/users/:id", async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      try {
        const user = await updateUser(deps.updateUserDeps, tenantId, request.params.id, request.body ?? {});
        if (!user) {
          return reply.status(404).send({ message: "User not found for this tenant." });
        }
        return reply.send(user);
      } catch (err) {
        return mapError(reply, err);
      }
  });
}
