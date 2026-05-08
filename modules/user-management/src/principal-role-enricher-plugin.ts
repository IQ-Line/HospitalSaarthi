import type { Principal } from "@hims/ts-sdk-identity";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { projectPrincipalRoles } from "./use-cases/project-principal-roles.js";
import type { PrincipalRoleProjectionRepository } from "./ports/index.js";

type RequestWithOptionalUser = FastifyRequest & { user?: unknown };

function asPrincipal(user: unknown): Principal | null {
  if (user == null || typeof user !== "object") return null;
  const principal = user as Partial<Principal>;
  if (typeof principal.userId !== "string") return null;
  if (typeof principal.tenantId !== "string") return null;
  if (typeof principal.orgId !== "string") return null;
  if (typeof principal.sessionId !== "string") return null;
  if (typeof principal.iat !== "number") return null;
  if (typeof principal.exp !== "number") return null;
  if (typeof principal.iss !== "string") return null;
  return principal as Principal;
}

export interface PrincipalRoleEnricherPluginOptions {
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
}

const principalRoleEnricherPluginImpl: FastifyPluginAsync<
  PrincipalRoleEnricherPluginOptions
> = async (fastify, options) => {
  fastify.addHook("onRequest", async (request) => {
    const principal = asPrincipal((request as RequestWithOptionalUser).user);
    if (principal === null) return;

    const roles = await projectPrincipalRoles(
      {
        principalRoleProjectionRepository: options.principalRoleProjectionRepository,
      },
      principal.tenantId,
      principal.userId,
    );

    request.user = {
      ...principal,
      roles,
    };
  });
};

export const principalRoleEnricherPlugin = fp(principalRoleEnricherPluginImpl, {
  fastify: "5.x",
  name: "@hims/user-management-principal-role-enricher",
  dependencies: ["@hims/ts-sdk-identity"],
});
