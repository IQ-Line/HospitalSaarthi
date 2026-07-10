import type { UserRepository } from "../ports/index.js";

/**
 * `user_capabilities.granted_by_user_id` / `revoked_by_user_id` FKs are tenant-scoped.
 * Platform operators acting cross-tenant via Configurator may not have a `users` row in the target tenant.
 */
export async function resolveGrantActorIdForTenant(
  userRepository: Pick<UserRepository, "getUserById">,
  tenantId: string,
  actorId: string | null,
): Promise<string | null> {
  if (actorId == null) {
    return null;
  }
  const trimmed = actorId.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const actor = await userRepository.getUserById(tenantId, trimmed);
  return actor !== null ? trimmed : null;
}
