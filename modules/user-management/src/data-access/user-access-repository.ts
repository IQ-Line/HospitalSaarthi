import { isPostgresForeignKeyViolation, type DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "drizzle-orm";
import type {
  AppliedRoleTemplate,
  CapabilityOverrideInput,
  UserAccessRepository,
  UserCapabilityGrant,
} from "../ports/index.js";
import {
  DuplicateUserRoleTemplateError,
  UnexpectedPersistenceError,
  UserNotFoundError,
} from "../domain/errors.js";
import { capabilities, roles, user_capabilities, user_roles } from "../schema/tables.js";

function asIsoString(value: Date): string {
  return value.toISOString();
}

function mapCapabilityOverrideRow(row: {
  id: string;
  user_id: string;
  capability_id: string;
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  description: string | null;
  effect: "grant" | "deny";
  reason: string | null;
  granted_by_user_id: string | null;
  granted_at: Date;
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
    effect: row.effect,
    reason: row.reason,
    granted_by_user_id: row.granted_by_user_id,
    granted_at: asIsoString(row.granted_at),
  };
}

const capabilityOverrideColumns = {
  id: user_capabilities.id,
  user_id: user_capabilities.user_id,
  capability_id: user_capabilities.capability_id,
  capability_key: capabilities.capability_key,
  module: capabilities.module,
  feature: capabilities.feature,
  action: capabilities.action,
  display_name: capabilities.display_name,
  description: capabilities.description,
  effect: user_capabilities.effect,
  reason: user_capabilities.reason,
  granted_by_user_id: user_capabilities.granted_by_user_id,
  granted_at: user_capabilities.granted_at,
} as const;

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

/**
 * Merges a PUT's grant and deny override lists into one row per capability. Deny wins: a
 * capability present in both lists resolves as a single `deny` row (ADR-0037 / issue #60 risk 3),
 * which the `UNIQUE(iq_tenant_id, user_id, capability_id)` shape structurally requires.
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

export class DrizzleUserAccessRepository implements UserAccessRepository {
  constructor(private readonly db: DbInstance) {}

  async applyRoleTemplate(
    tenantId: string,
    input: {
      userId: string;
      roleId: string;
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
      .select(capabilityOverrideColumns)
      .from(user_capabilities)
      .innerJoin(capabilities, eq(user_capabilities.capability_id, capabilities.id))
      .where(
        and(
          eq(user_capabilities.iq_tenant_id, tenantId),
          eq(user_capabilities.user_id, userId),
        ),
      );

    return rows
      .map((row) => mapCapabilityOverrideRow(row))
      .sort((left, right) => left.capability_key.localeCompare(right.capability_key));
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
    return this.db.transaction(async (tx) => {
      await tx
        .delete(user_capabilities)
        .where(
          and(
            eq(user_capabilities.iq_tenant_id, tenantId),
            eq(user_capabilities.user_id, input.userId),
          ),
        );

      const merged = mergeOverrides(input.grants, input.denies);
      if (merged.length > 0) {
        const grantedAt = new Date();
        await tx.insert(user_capabilities).values(
          merged.map((override) => ({
            iq_tenant_id: tenantId,
            user_id: input.userId,
            capability_id: override.capability_id,
            effect: override.effect,
            reason: override.reason,
            granted_by_user_id: input.actorId,
            granted_at: grantedAt,
          })),
        );
      }

      const rows = await tx
        .select(capabilityOverrideColumns)
        .from(user_capabilities)
        .innerJoin(capabilities, eq(user_capabilities.capability_id, capabilities.id))
        .where(
          and(
            eq(user_capabilities.iq_tenant_id, tenantId),
            eq(user_capabilities.user_id, input.userId),
          ),
        );

      return rows
        .map((row) => mapCapabilityOverrideRow(row))
        .sort((left, right) => left.capability_key.localeCompare(right.capability_key));
    });
  }
}
