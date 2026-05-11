import type { Principal as IdentityPrincipal } from "@hims/ts-sdk-identity";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { UserNotFoundError } from "./domain/errors.js";
import type { Principal as CerbosPrincipalPayload } from "./domain/types.js";
import { replyWithUserManagementError } from "./http/map-user-management-error.js";
import type { AuthContext, PrincipalService } from "./ports/index.js";
import { getPrincipal } from "./use-cases/get-principal.js";

type RequestWithOptionalUser = FastifyRequest & { user?: unknown };

function asIdentityPrincipal(user: unknown): IdentityPrincipal | null {
  if (user == null || typeof user !== "object") return null;
  const principal = user as Partial<IdentityPrincipal>;
  if (typeof principal.userId !== "string") return null;
  if (typeof principal.tenantId !== "string") return null;
  if (typeof principal.orgId !== "string") return null;
  if (typeof principal.sessionId !== "string") return null;
  if (typeof principal.iat !== "number") return null;
  if (typeof principal.exp !== "number") return null;
  if (typeof principal.iss !== "string") return null;
  return principal as IdentityPrincipal;
}

function applyCerbosPayloadToIdentity(
  identity: IdentityPrincipal,
  payload: CerbosPrincipalPayload,
): void {
  identity.roles = payload.roles;
  const org = payload.attributes.org_id;
  identity.orgId =
    typeof org === "string" && org.trim().length > 0 ? org.trim() : "";
  const dept = payload.attributes.department;
  identity.department =
    typeof dept === "string" && dept.trim().length > 0 ? dept.trim() : undefined;
  identity.capabilities = payload.attributes.capabilities;
  identity.delegatedCapabilities = payload.attributes.delegated_capabilities;
  identity.clearances = payload.attributes.clearances;
  identity.umClearanceEffectiveTier = payload.attributes.um_clearance_effective_tier;
}

export interface PrincipalEnricherPluginOptions {
  principalService: PrincipalService;
}

declare module "fastify" {
  interface FastifyRequest {
    /** Same object returned by GET /auth/principal and passed to Cerbos (PEP). */
    cerbosPrincipal?: CerbosPrincipalPayload;
  }
}

const principalEnrichmentPluginImpl: FastifyPluginAsync<PrincipalEnricherPluginOptions> = async (
  fastify,
  options,
) => {
  fastify.addHook("onRequest", async (request, reply) => {
    const identity = asIdentityPrincipal((request as RequestWithOptionalUser).user);
    if (identity === null) return;

    const context: AuthContext = {
      tenantId: identity.tenantId,
      userId: identity.userId,
      requestUser: identity,
    };

    try {
      const payload = await getPrincipal({ principalService: options.principalService }, context);
      request.cerbosPrincipal = payload;
      applyCerbosPayloadToIdentity(identity, payload);
      (request as RequestWithOptionalUser).user = identity;
    } catch (err) {
      if (err instanceof UserNotFoundError) {
        return replyWithUserManagementError(
          reply,
          err,
          request.correlationId ?? request.id,
        );
      }
      throw err;
    }
  });
};

export const principalEnrichmentPlugin = fp(principalEnrichmentPluginImpl, {
  fastify: "5.x",
  name: "@hims/user-management-principal-enrichment",
  dependencies: ["@hims/ts-sdk-identity"],
});
