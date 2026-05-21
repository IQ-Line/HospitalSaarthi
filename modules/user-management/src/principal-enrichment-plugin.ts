import type { Principal as IdentityPrincipal } from "@hims/ts-sdk-identity";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { UserManagementError } from "./domain/errors.js";
import {
  compareCanonicalRoleCodes,
  normalizeRoleCode,
} from "./domain/normalize-role-code.js";
import type { Principal as CerbosPrincipalPayload } from "./domain/types.js";
import { replyWithUserManagementError } from "./http/map-user-management-error.js";
import { resolveJwtTenantIdFromRequest } from "./http/resolve-effective-tenant-id.js";
import type { AuthContext, PrincipalService, UserRepository } from "./ports/index.js";
import { getPrincipal } from "./use-cases/get-principal.js";

type RequestWithOptionalUser = FastifyRequest & { user?: unknown };

/** Identity plugin already verified the JWT; only require stable ids for enrichment. */
function asIdentityPrincipal(user: unknown): IdentityPrincipal | null {
  if (user == null || typeof user !== "object") return null;
  const principal = user as Partial<IdentityPrincipal>;
  const userId = typeof principal.userId === "string" ? principal.userId.trim() : "";
  const tenantId = typeof principal.tenantId === "string" ? principal.tenantId.trim() : "";
  if (userId.length === 0 || tenantId.length === 0) return null;
  return user as IdentityPrincipal;
}

/** Cerbos `super-admin` rules and cross-tenant headers rely on JWT role claims until DB projection catches up. */
function mergePrincipalRoleCodes(jwtRoles: string[], persistedRoles: string[]): string[] {
  const roleCodeSet = new Set<string>();
  for (const raw of [...jwtRoles, ...persistedRoles]) {
    const code = normalizeRoleCode(raw);
    if (code.length > 0) {
      roleCodeSet.add(code);
    }
  }
  return [...roleCodeSet].sort(compareCanonicalRoleCodes);
}

function applyCerbosPayloadToIdentity(
  identity: IdentityPrincipal,
  payload: CerbosPrincipalPayload,
): void {
  const jwtRoles = Array.isArray(identity.roles) ? identity.roles : [];
  identity.roles = mergePrincipalRoleCodes(jwtRoles, payload.roles);
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
  userRepository: UserRepository;
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

    // Principal rows are tenant-scoped: cross-tenant `iq_tenant_id` scopes persistence,
    // but enrichment must load the signed-in user from their JWT home tenant.
    const located = await options.userRepository.findUserByGlobalId(identity.userId);
    const platformUserId = located?.id ?? identity.userId;
    const context: AuthContext = {
      tenantId: located?.iq_tenant_id ?? resolveJwtTenantIdFromRequest(request),
      userId: platformUserId,
      requestUser: identity,
    };

    try {
      const payload = await getPrincipal({ principalService: options.principalService }, context);
      const jwtRoles = Array.isArray(identity.roles) ? identity.roles : [];
      payload.roles = mergePrincipalRoleCodes(jwtRoles, payload.roles);
      payload.attributes.role_codes = payload.roles;
      request.cerbosPrincipal = payload;
      applyCerbosPayloadToIdentity(identity, payload);
      (request as RequestWithOptionalUser).user = identity;
    } catch (err) {
      if (reply.sent) return;
      if (err instanceof UserManagementError) {
        return replyWithUserManagementError(
          reply,
          err,
          request.correlationId ?? request.id,
        );
      }
      request.log.error({ err }, "principal enrichment failed");
      throw err;
    }
  });
};

export const principalEnrichmentPlugin = fp(principalEnrichmentPluginImpl, {
  fastify: "5.x",
  name: "@hims/user-management-principal-enrichment",
  dependencies: ["@hims/ts-sdk-identity"],
});
