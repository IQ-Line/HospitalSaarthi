import type { FastifyRequest } from "fastify";
import type { Principal } from "@hims/ts-sdk-identity";

/**
 * The authenticated actor's stable user id, for `created_by`/`updated_by` audit columns.
 *
 * Read straight off `request.user` — populated by the identity plugin (JWT `sub`) and refined by
 * the principal enricher. There is intentionally NO unsigned-JWT fallback: authorization is the
 * Cerbos PEP's job, and every write route that needs an actor is `authMode:'protected'`, so
 * `request.user` is always present by the time a handler runs. Returns null only in code paths
 * that run without identity (which never reach a protected write).
 */
export function getRequestActorId(request: FastifyRequest): string | null {
  const user = (request as FastifyRequest & { user?: Principal }).user;
  const userId = user?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}
