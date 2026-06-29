import type { FastifyInstance } from "fastify";
import { computeUserActive } from "../domain/user-activation.js";
import type { UserActivationStatusReaderPort } from "../ports/user-activation-status-reader.js";

export type InternalUserStatusHandlersDeps = {
  userActivationStatusReader: UserActivationStatusReaderPort;
  /** Shared S2S secret (`x-um-internal-key`) — the same key as the entitlement-cache route. */
  internalApiKey?: string;
};

function isAuthorizedInternalRequest(
  request: { headers: Record<string, unknown> },
  internalApiKey: string | undefined,
): boolean {
  if (internalApiKey === undefined || internalApiKey.length === 0) {
    return false;
  }
  const header = request.headers["x-um-internal-key"];
  return typeof header === "string" && header === internalApiKey;
}

/**
 * Internal S2S route the BFF edge calls (per authenticated request, cached) to enforce
 * the D13 ban/revocation cutoff: it catches users deactivated or banned AFTER their
 * current access token was issued, inside that token's remaining TTL.
 *
 * An unknown user id resolves to `active: false`: a deleted or foreign id must never
 * pass the cutoff. Transient DB failures throw → 5xx, which the BFF treats as fail-open
 * (degraded to the status-quo token-TTL window), NOT as "inactive".
 */
export function registerInternalUserStatusHandlers(
  fastify: FastifyInstance,
  deps: InternalUserStatusHandlersDeps,
): void {
  fastify.get<{ Params: { userId: string }; Querystring: { tenant_id?: string } }>(
    "/internal/users/:userId/active",
    { config: { authMode: "public" } },
    async (request, reply) => {
      if (!isAuthorizedInternalRequest(request, deps.internalApiKey)) {
        return reply.status(401).send({
          error: "unauthorized",
          message: "Missing or invalid x-um-internal-key",
        });
      }

      const tenantId = (request.query.tenant_id ?? "").trim();
      if (tenantId.length === 0) {
        return reply.status(400).send({ error: "tenant_id_required" });
      }
      const userId = request.params.userId.trim();
      if (userId.length === 0) {
        return reply.status(400).send({ error: "user_id_required" });
      }

      const facts = await deps.userActivationStatusReader.getActivationFacts(tenantId, userId);
      if (facts === null) {
        return reply.send({ active: false });
      }

      return reply.send({ active: computeUserActive(facts, new Date()) });
    },
  );
}
