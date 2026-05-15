import { randomUUID } from "node:crypto";
import type {
  AppliedRoleTemplate,
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

export class InMemoryUserAccessRepository implements UserAccessRepository {
  private readonly roleTemplates = new Map<string, AppliedRoleTemplate>();
  private readonly capabilityGrants = new Map<string, Map<string, UserCapabilityGrant>>();

  constructor(private readonly rolesById: (tenantId: string, roleId: string) => Promise<Role | null>) {}

  async applyRoleTemplate(
    tenantId: string,
    input: {
      userId: string;
      roleId: string;
      capabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<AppliedRoleTemplate> {
    const role = await this.rolesById(tenantId, input.roleId);
    if (role === null) {
      throw new Error("ROLE_TEMPLATE_LOOKUP_FAILED");
    }

    const key = tenantUserRole(tenantId, input.userId, input.roleId);
    const existing = this.roleTemplates.get(key);
    if (existing) {
      return existing;
    }

    const applied: AppliedRoleTemplate = {
      id: randomUUID(),
      user_id: input.userId,
      role_id: input.roleId,
      assigned_by_user_id: input.actorId,
      assigned_at: new Date().toISOString(),
      role,
    };
    this.roleTemplates.set(key, applied);

    const userKey = tenantUser(tenantId, input.userId);
    const grants = this.capabilityGrants.get(userKey) ?? new Map<string, UserCapabilityGrant>();
    this.capabilityGrants.set(userKey, grants);

    for (const capabilityId of [...new Set(input.capabilityIds)]) {
      if (grants.has(capabilityId)) continue;
      grants.set(capabilityId, {
        id: randomUUID(),
        user_id: input.userId,
        capability_id: capabilityId,
        capability_key: capabilityId,
        module: "user-management",
        feature: "unknown",
        action: "unknown",
        display_name: capabilityId,
        description: null,
        grant_source: "role_template",
        source_role_id: input.roleId,
        granted_by_user_id: input.actorId,
        granted_at: new Date().toISOString(),
        revoked_at: null,
        revoked_by_user_id: null,
      });
    }

    return applied;
  }

  async detachRoleTemplate(
    tenantId: string,
    input: {
      userId: string;
      roleId: string;
    },
  ): Promise<AppliedRoleTemplate | null> {
    const key = tenantUserRole(tenantId, input.userId, input.roleId);
    const existing = this.roleTemplates.get(key) ?? null;
    if (existing) {
      this.roleTemplates.delete(key);
    }
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
    return [...(this.capabilityGrants.get(tenantUser(tenantId, userId))?.values() ?? [])].filter(
      (grant) => grant.revoked_at === null,
    );
  }

  async replaceManualCapabilityGrants(
    tenantId: string,
    input: {
      userId: string;
      capabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<UserCapabilityGrant[]> {
    const key = tenantUser(tenantId, input.userId);
    const grants = this.capabilityGrants.get(key) ?? new Map<string, UserCapabilityGrant>();
    this.capabilityGrants.set(key, grants);

    const desired = new Set(input.capabilityIds);
    for (const [capabilityId, grant] of grants.entries()) {
      if (grant.grant_source === "manual" && !desired.has(capabilityId)) {
        grant.revoked_at = new Date().toISOString();
        grant.revoked_by_user_id = input.actorId;
      }
    }

    for (const capabilityId of desired) {
      const existing = grants.get(capabilityId);
      if (existing && existing.revoked_at === null) {
        continue;
      }
      grants.set(capabilityId, {
        id: existing?.id ?? randomUUID(),
        user_id: input.userId,
        capability_id: capabilityId,
        capability_key: capabilityId,
        module: "user-management",
        feature: "unknown",
        action: "unknown",
        display_name: capabilityId,
        description: null,
        grant_source: "manual",
        source_role_id: null,
        granted_by_user_id: input.actorId,
        granted_at: new Date().toISOString(),
        revoked_at: null,
        revoked_by_user_id: null,
      });
    }

    return [...grants.values()].filter((grant) => grant.revoked_at === null);
  }
}
