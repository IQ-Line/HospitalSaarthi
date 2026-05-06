import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthContext } from "../ports/index.js";

type RequestWithOptionalUser = FastifyRequest & { user?: unknown };
import { getPrincipal } from "../use-cases/get-principal.js";
import type { GetPrincipalDeps } from "../use-cases/get-principal.js";
import { getUserById } from "../use-cases/get-user.js";
import type { GetUserDeps } from "../use-cases/get-user.js";

export type AuthHandlersDeps = {
  /** Tenant from verified JWT (`iq_tenant_id` / `tenantId` on `request.user`). */
  getTenantId: (request: FastifyRequest) => string;
  /** Platform user id from verified JWT (`sub` / `userId` on `request.user`). */
  getUserId: (request: FastifyRequest) => string;
  getUserDeps: GetUserDeps;
  getPrincipalDeps: GetPrincipalDeps;
};

function mapError(reply: FastifyReply, err: unknown) {
  if (err instanceof Error) {
    return reply.status(400).send({ message: err.message });
  }
  return reply.status(400).send({ message: "Bad Request" });
}

export function registerAuthHandlers(fastify: FastifyInstance, deps: AuthHandlersDeps): void {
  fastify.get("/auth/me", async (request, reply) => {
    const tenantId = deps.getTenantId(request);
    const userId = deps.getUserId(request);
    const user = await getUserById(deps.getUserDeps, tenantId, userId);
    if (user === null) {
      return reply.status(404).send({ message: "User not found for this tenant." });
    }
    return reply.send(user);
  });

  fastify.get("/auth/principal", async (request, reply) => {
    const context: AuthContext = {
      tenantId: deps.getTenantId(request),
      userId: deps.getUserId(request),
      requestUser: (request as RequestWithOptionalUser).user,
    };
    try {
      const principal = await getPrincipal(deps.getPrincipalDeps, context);
      return reply.send(principal);
    } catch (err) {
      return mapError(reply, err);
    }
  });
}
