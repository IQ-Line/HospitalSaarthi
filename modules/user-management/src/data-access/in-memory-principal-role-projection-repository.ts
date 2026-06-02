import type {
  PrincipalRoleProjectionRepository,
  RoleRepository,
  UserAccessRepository,
} from "../ports/index.js";

function projectionCacheKey(tenantId: string, userId: string): string {
  return `${tenantId}\0${userId}`;
}

/**
 * Dev/test adapter: one user-role listing plus at most one {@link RoleRepository} lookup per distinct role_id.
 */
export class InMemoryPrincipalRoleProjectionRepository implements PrincipalRoleProjectionRepository {
  private readonly projectionCache = new Map<string, string[]>();

  constructor(
    private readonly userAccessRepository: UserAccessRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  clearCache(): void {
    this.projectionCache.clear();
  }

  async listRoleCodesByUser(tenantId: string, userId: string): Promise<string[]> {
    const key = projectionCacheKey(tenantId, userId);
    const cached = this.projectionCache.get(key);
    if (cached !== undefined) {
      return [...cached];
    }

    const refs = await this.userAccessRepository.listRoleTemplatesByUser(tenantId, userId);
    const roleCache = new Map<string, Awaited<ReturnType<RoleRepository["getRoleById"]>>>();
    const codes: string[] = [];

    for (const ref of refs) {
      let role = roleCache.get(ref.role_id);
      if (role === undefined) {
        role = await this.roleRepository.getRoleById(tenantId, ref.role_id);
        roleCache.set(ref.role_id, role);
      }
      if (role !== null) {
        codes.push(role.code);
        const roleType = role.role_type.trim();
        if (roleType.length > 0 && roleType !== role.code) {
          codes.push(roleType);
        }
      }
    }

    this.projectionCache.set(key, [...codes]);
    return [...codes];
  }
}
