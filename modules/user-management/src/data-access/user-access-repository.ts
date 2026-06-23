import { isPostgresForeignKeyViolation, type DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type {
  AppliedRoleTemplate,
  UserAccessRepository,
  UserCapabilityGrant,
} from "../ports/index.js";
import {
  DuplicateUserRoleTemplateError,
  UnexpectedPersistenceError,
  UserNotFoundError,
} from "../domain/errors.js";
import {
  revokeRoleTemplateCapabilitySnapshot,
  syncRoleTemplateCapabilitySnapshot,
} from "./role-template-grant-writes.js";
import { capabilities, roles, user_capabilities, user_roles } from "../schema/tables.js";

function asIsoString(value: Date): string {
  return value.toISOString();
}

function mapCapabilityGrantRow(row: {
  id: string;
  user_id: string;
  capability_id: string;
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  description: string | null;
  grant_source: "manual" | "role_template" | "delegated" | "system";
  source_role_id: string | null;
  granted_by_user_id: string | null;
  granted_at: Date;
  revoked_at: Date | null;
  revoked_by_user_id: string | null;
}): UserCapabilityGrant {
  return {
    id: row.id,
    user_id: row.user_id,
    capability_id: row.capability_id,
    capability_key: row.capability_key,
    module: row.module,
    feature: row.feature,
    action: row.action,
    display_name: row.display_name,
    description: row.description,
    grant_source: row.grant_source,
    source_role_id: row.source_role_id,
    granted_by_user_id: row.granted_by_user_id,
    granted_at: asIsoString(row.granted_at),
    revoked_at: row.revoked_at ? asIsoString(row.revoked_at) : null,
    revoked_by_user_id: row.revoked_by_user_id,
  };
}

function mapAppliedRoleTemplateRow(row: {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by_user_id: string | null;
  assigned_at: Date;
  role_code: string;
  role_type: string;
  role_display_name: string;
  role_description: string | null;
  role_is_system: boolean;
  role_status: "active" | "inactive";
}): AppliedRoleTemplate {
  return {
    id: row.id,
    user_id: row.user_id,
    role_id: row.role_id,
    assigned_by_user_id: row.assigned_by_user_id,
    assigned_at: asIsoString(row.assigned_at),
    role: {
      id: row.role_id,
      code: row.role_code,
      role_type: row.role_type,
      display_name: row.role_display_name,
      description: row.role_description,
      is_system: row.role_is_system,
      status: row.role_status,
    },
  };
}

async function selectRoleTemplateByUserAndRole(
  db: DbInstance,
  tenantId: string,
  userId: string,
  roleId: string,
): Promise<AppliedRoleTemplate | null> {
  const [row] = await db
    .select({
      id: user_roles.id,
      user_id: user_roles.user_id,
      role_id: user_roles.role_id,
      assigned_by_user_id: user_roles.assigned_by_user_id,
      assigned_at: user_roles.assigned_at,
      role_code: roles.code,
      role_type: roles.role_type,
      role_display_name: roles.display_name,
      role_description: roles.description,
      role_is_system: roles.is_system,
      role_status: roles.status,
    })
    .from(user_roles)
    .innerJoin(
      roles,
      and(eq(user_roles.iq_tenant_id, roles.iq_tenant_id), eq(user_roles.role_id, roles.id)),
    )
    .where(
      and(
        eq(user_roles.iq_tenant_id, tenantId),
        eq(user_roles.user_id, userId),
        eq(user_roles.role_id, roleId),
      ),
    )
    .limit(1);

  return row ? mapAppliedRoleTemplateRow(row) : null;
}

export class DrizzleUserAccessRepository implements UserAccessRepository {
  constructor(private readonly db: DbInstance) {}

  async applyRoleTemplate(
    tenantId: string,
    input: {
      userId: string;
      roleId: string;
      capabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<AppliedRoleTemplate> {
    try {
      return await this.db.transaction(async (tx) => {
        await tx
          .insert(user_roles)
          .values({
            iq_tenant_id: tenantId,
            user_id: input.userId,
            role_id: input.roleId,
            assigned_by_user_id: input.actorId,
          })
          .onConflictDoNothing();

        await syncRoleTemplateCapabilitySnapshot(tx, tenantId, input);

        const applied = await selectRoleTemplateByUserAndRole(tx, tenantId, input.userId, input.roleId);
        if (applied === null) {
          throw new UnexpectedPersistenceError();
        }
        return applied;
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === "23505"
      ) {
        throw new DuplicateUserRoleTemplateError();
      }
      if (isPostgresForeignKeyViolation(error)) {
        throw new UserNotFoundError(input.actorId ?? undefined);
      }
      throw error;
    }
  }

  async detachRoleTemplate(
    tenantId: string,
    input: {
      userId: string;
      roleId: string;
      actorId: string | null;
    },
  ): Promise<AppliedRoleTemplate | null> {
    return this.db.transaction(async (tx) => {
      const existing = await selectRoleTemplateByUserAndRole(tx, tenantId, input.userId, input.roleId);
      if (existing === null) {
        return null;
      }

      await tx
        .delete(user_roles)
        .where(
          and(
            eq(user_roles.iq_tenant_id, tenantId),
            eq(user_roles.user_id, input.userId),
            eq(user_roles.role_id, input.roleId),
          ),
        );

      await revokeRoleTemplateCapabilitySnapshot(tx, tenantId, {
        userId: input.userId,
        roleId: input.roleId,
        actorId: input.actorId,
      });

      return existing;
    });
  }

  async listRoleTemplatesByUser(tenantId: string, userId: string): Promise<AppliedRoleTemplate[]> {
    const rows = await this.db
      .select({
        id: user_roles.id,
        user_id: user_roles.user_id,
        role_id: user_roles.role_id,
        assigned_by_user_id: user_roles.assigned_by_user_id,
        assigned_at: user_roles.assigned_at,
        role_code: roles.code,
        role_type: roles.role_type,
        role_display_name: roles.display_name,
        role_description: roles.description,
        role_is_system: roles.is_system,
        role_status: roles.status,
      })
      .from(user_roles)
      .innerJoin(
        roles,
        and(eq(user_roles.iq_tenant_id, roles.iq_tenant_id), eq(user_roles.role_id, roles.id)),
      )
      .where(and(eq(user_roles.iq_tenant_id, tenantId), eq(user_roles.user_id, userId)));

    return rows.map((row) => mapAppliedRoleTemplateRow(row));
  }

  async listActiveCapabilityGrantsByUser(
    tenantId: string,
    userId: string,
  ): Promise<UserCapabilityGrant[]> {
    const rows = await this.db
      .select({
        id: user_capabilities.id,
        user_id: user_capabilities.user_id,
        capability_id: user_capabilities.capability_id,
        capability_key: capabilities.capability_key,
        module: capabilities.module,
        feature: capabilities.feature,
        action: capabilities.action,
        display_name: capabilities.display_name,
        description: capabilities.description,
        grant_source: user_capabilities.grant_source,
        source_role_id: user_capabilities.source_role_id,
        granted_by_user_id: user_capabilities.granted_by_user_id,
        granted_at: user_capabilities.granted_at,
        revoked_at: user_capabilities.revoked_at,
        revoked_by_user_id: user_capabilities.revoked_by_user_id,
      })
      .from(user_capabilities)
      .innerJoin(capabilities, eq(user_capabilities.capability_id, capabilities.id))
      .where(
        and(
          eq(user_capabilities.iq_tenant_id, tenantId),
          eq(user_capabilities.user_id, userId),
          isNull(user_capabilities.revoked_at),
        ),
      );

    return rows
      .map((row) => mapCapabilityGrantRow(row))
      .sort((left, right) => left.capability_key.localeCompare(right.capability_key));
  }

  async replaceManualCapabilityGrants(
    tenantId: string,
    input: {
      userId: string;
      capabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<UserCapabilityGrant[]> {
    return this.db.transaction(async (tx) => {
      const desiredIds = [...new Set(input.capabilityIds)];
      const current = await tx
        .select({
          id: user_capabilities.id,
          capability_id: user_capabilities.capability_id,
          grant_source: user_capabilities.grant_source,
        })
        .from(user_capabilities)
        .where(
          and(
            eq(user_capabilities.iq_tenant_id, tenantId),
            eq(user_capabilities.user_id, input.userId),
            isNull(user_capabilities.revoked_at),
          ),
        );

      const activeByCapabilityId = new Set(current.map((row) => row.capability_id));
      const manualGrantIdsToRevoke = current
        .filter(
          (row) => row.grant_source === "manual" && !desiredIds.includes(row.capability_id),
        )
        .map((row) => row.id);

      if (manualGrantIdsToRevoke.length > 0) {
        await tx
          .update(user_capabilities)
          .set({
            revoked_at: new Date(),
            revoked_by_user_id: input.actorId,
          })
          .where(
            and(
              eq(user_capabilities.iq_tenant_id, tenantId),
              inArray(user_capabilities.id, manualGrantIdsToRevoke),
            ),
          );
      }

      const missingCapabilityIds = desiredIds.filter((capabilityId) => !activeByCapabilityId.has(capabilityId));
      if (missingCapabilityIds.length > 0) {
        const grantedAt = new Date();
        await tx
          .insert(user_capabilities)
          .values(
            missingCapabilityIds.map((capabilityId) => ({
              iq_tenant_id: tenantId,
              user_id: input.userId,
              capability_id: capabilityId,
              grant_source: "manual" as const,
              source_role_id: null,
              granted_by_user_id: input.actorId,
              granted_at: grantedAt,
              revoked_at: null,
              revoked_by_user_id: null,
            })),
          )
          .onConflictDoUpdate({
            target: [
              user_capabilities.iq_tenant_id,
              user_capabilities.user_id,
              user_capabilities.capability_id,
            ],
            set: {
              grant_source: "manual",
              source_role_id: null,
              granted_by_user_id: input.actorId,
              granted_at: grantedAt,
              revoked_at: null,
              revoked_by_user_id: null,
            },
          });
      }

      const rows = await tx
        .select({
          id: user_capabilities.id,
          user_id: user_capabilities.user_id,
          capability_id: user_capabilities.capability_id,
          capability_key: capabilities.capability_key,
          module: capabilities.module,
          feature: capabilities.feature,
          action: capabilities.action,
          display_name: capabilities.display_name,
          description: capabilities.description,
          grant_source: user_capabilities.grant_source,
          source_role_id: user_capabilities.source_role_id,
          granted_by_user_id: user_capabilities.granted_by_user_id,
          granted_at: user_capabilities.granted_at,
          revoked_at: user_capabilities.revoked_at,
          revoked_by_user_id: user_capabilities.revoked_by_user_id,
        })
        .from(user_capabilities)
        .innerJoin(capabilities, eq(user_capabilities.capability_id, capabilities.id))
        .where(
          and(
            eq(user_capabilities.iq_tenant_id, tenantId),
            eq(user_capabilities.user_id, input.userId),
            isNull(user_capabilities.revoked_at),
          ),
        );

      return rows
        .map((row) => mapCapabilityGrantRow(row))
        .sort((left, right) => left.capability_key.localeCompare(right.capability_key));
    });
  }
}
