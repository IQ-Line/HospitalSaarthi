import { randomUUID } from "node:crypto";
import type {
  AppliedRoleTemplate,
  CapabilityOverrideInput,
  Role,
  UserAccessRepository,
  UserCapabilityGrant,
} from "../ports/index.js";

function tenantUser(tenantId: string, userId: string): string {
  return `${tenantId}\0${userId}`;
}

function tenantUserRole(tenantId: string, userId: string, roleId: string): string {
  return `${tenantUser(tenantId, userId)}\0${roleId}`;
}

/**
 * Merges grant/deny override lists into one entry per capability. Deny wins (ADR-0037): a
 * capability in both lists resolves as `deny`, mirroring the Drizzle single-row upsert.
 */
function mergeOverrides(
  grants: CapabilityOverrideInput[],
  denies: CapabilityOverrideInput[],
): Array<{ capability_id: string; effect: "grant" | "deny"; reason: string | null }> {
  const merged = new Map<string, { effect: "grant" | "deny"; reason: string | null }>();
  for (const grant of grants) {
    merged.set(grant.capability_id, { effect: "grant", reason: grant.reason ?? null });
  }
  for (const deny of denies) {
    merged.set(deny.capability_id, { effect: "deny", reason: deny.reason ?? null });
  }
  return [...merged.entries()].map(([capability_id, value]) => ({ capability_id, ...value }));
}

export class InMemoryUserAccessRepository implements UserAccessRepository {
  private readonly roleTemplates = new Map<string, AppliedRoleTemplate>();
  private readonly capabilityGrants = new Map<string, Map<string, UserCapabilityGrant>>();

  constructor(private readonly rolesById: (tenantId: string, roleId: string) => Promise<Role | null>) {}

  async applyRoleTemplate(
    tenantId: string,
    input: {
      userId: string;
      roleId: string;
      actorId: string | null;
    },
  ): Promise<AppliedRoleTemplate> {
    const role = await this.rolesById(tenantId, input.roleId);
    if (role === null) {
      throw new Error("ROLE_TEMPLATE_LOOKUP_FAILED");
    }

    const key = tenantUserRole(tenantId, input.userId, input.roleId);
    let applied = this.roleTemplates.get(key);
    if (!applied) {
      applied = {
        id: randomUUID(),
        user_id: input.userId,
        role_id: input.roleId,
        assigned_by_user_id: input.actorId,
        assigned_at: new Date().toISOString(),
        role,
      };
      this.roleTemplates.set(key, applied);
    }

    return applied;
  }

  async detachRoleTemplate(
    tenantId: string,
    input: {
      userId: string;
      roleId: string;
      actorId: string | null;
    },
  ): Promise<AppliedRoleTemplate | null> {
    const key = tenantUserRole(tenantId, input.userId, input.roleId);
    const existing = this.roleTemplates.get(key) ?? null;
    if (existing === null) {
      return null;
    }

    this.roleTemplates.delete(key);
    return existing;
  }

  async listRoleTemplatesByUser(tenantId: string, userId: string): Promise<AppliedRoleTemplate[]> {
    const prefix = `${tenantUser(tenantId, userId)}\0`;
    return [...this.roleTemplates.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value);
  }

  async listActiveCapabilityGrantsByUser(
    tenantId: string,
    userId: string,
  ): Promise<UserCapabilityGrant[]> {
    return [...(this.capabilityGrants.get(tenantUser(tenantId, userId))?.values() ?? [])];
  }

  async replaceCapabilityOverrides(
    tenantId: string,
    input: {
      userId: string;
      grants: CapabilityOverrideInput[];
      denies: CapabilityOverrideInput[];
      actorId: string | null;
    },
  ): Promise<UserCapabilityGrant[]> {
    const key = tenantUser(tenantId, input.userId);
    const grants = new Map<string, UserCapabilityGrant>();
    this.capabilityGrants.set(key, grants);

    const grantedAt = new Date().toISOString();
    for (const override of mergeOverrides(input.grants, input.denies)) {
      grants.set(override.capability_id, {
        id: randomUUID(),
        user_id: input.userId,
        capability_id: override.capability_id,
        capability_key: override.capability_id,
        module: "user-management",
        feature: "unknown",
        action: "unknown",
        display_name: override.capability_id,
        description: null,
        effect: override.effect,
        reason: override.reason,
        granted_by_user_id: input.actorId,
        granted_at: grantedAt,
      });
    }

    return [...grants.values()];
  }
}
