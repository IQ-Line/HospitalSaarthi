import type { FastifyInstance, FastifyRequest } from "fastify";
import { UserNotFoundError } from "../domain/errors.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import type { AuthContext } from "../ports/index.js";
import { getPrincipal } from "../use-cases/get-principal.js";
import type { GetPrincipalDeps } from "../use-cases/get-principal.js";
import { getUserById } from "../use-cases/get-user.js";
import type { GetUserDeps } from "../use-cases/get-user.js";

type RequestWithOptionalUser = FastifyRequest & { user?: unknown };

export type AuthHandlersDeps = {
  /** Tenant from verified JWT (`iq_tenant_id` / `tenantId` on `request.user`). */
  getTenantId: (request: FastifyRequest) => string;
  /** Platform user id from verified JWT (`sub` / `userId` on `request.user`). */
  getUserId: (request: FastifyRequest) => string;
  getUserDeps: GetUserDeps;
  getPrincipalDeps: GetPrincipalDeps;
};

export function registerAuthHandlers(fastify: FastifyInstance, deps: AuthHandlersDeps): void {
  fastify.get(
    "/auth/me",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const userId = deps.getUserId(request);
      const cid = request.correlationId ?? request.id;
      const user = await getUserById(deps.getUserDeps, tenantId, userId);
      if (user === null) {
        return replyWithUserManagementError(reply, new UserNotFoundError(userId), cid);
      }
      return reply.send(user);
    },
  );

  fastify.get(
    "/auth/principal",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      const context: AuthContext = {
        tenantId: deps.getTenantId(request),
        userId: deps.getUserId(request),
        requestUser: (request as RequestWithOptionalUser).user,
      };
      try {
        const principal = await getPrincipal(deps.getPrincipalDeps, context);
        return reply.send(principal);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );
}
