import type { FastifyInstance, FastifyRequest } from "fastify";
import { CerbosPrincipalUnavailableError, UserNotFoundError } from "../domain/errors.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import { buildUxPermissionMap } from "../permissions/build-ux-permission-map.js";
import type { BuildUxPermissionMapDeps } from "../permissions/build-ux-permission-map.js";
import { getUserById } from "../use-cases/get-user.js";
import type { GetUserDeps } from "../use-cases/get-user.js";

export type AuthHandlersDeps = {
  /** Tenant from verified JWT (`iq_tenant_id` / `tenantId` on `request.user`). */
  getTenantId: (request: FastifyRequest) => string;
  /** Platform user id from verified JWT (`sub` / `userId` on `request.user`). */
  getUserId: (request: FastifyRequest) => string;
  getUserDeps: GetUserDeps;
  uxPermissionMapDeps: BuildUxPermissionMapDeps;
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
      const snapshot = request.cerbosPrincipal;
      if (snapshot === undefined) {
        return replyWithUserManagementError(reply, new CerbosPrincipalUnavailableError(), cid);
      }
      return reply.send(snapshot);
    },
  );

  fastify.get(
    "/auth/permissions-map",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        const map = await buildUxPermissionMap(request, deps.uxPermissionMapDeps);
        return reply.send({ map });
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );
}
