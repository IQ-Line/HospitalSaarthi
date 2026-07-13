import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  DuplicateUsernameError,
  UnexpectedPersistenceError,
} from "../domain/errors.js";
import { clampClearanceTierRequired } from "../domain/um-clearance-tier.js";
import { isPostgresUniqueViolation } from "./postgres-errors.js";
import { syncRoleTemplateCapabilitySnapshot } from "./role-template-grant-writes.js";
import type {
  ProvisionUserWithAccessInput,
  UserProvisioningRepository,
} from "../ports/user-provisioning-repository.js";
import type { User } from "../ports/index.js";
import { capabilities, pharmacy_store_assignments, roles, user_capabilities, user_roles, users } from "../schema/tables.js";

const userColumns = {
  id: users.id,
  full_name: users.full_name,
  email: users.email,
  phone: users.phone,
  auth_user_id: users.auth_user_id,
  status: users.status,
  username: users.username,
  org_id: users.org_id,
  department: users.department,
  clearance_tier_required: users.clearance_tier_required,
} as const;

function rowToUser(row: {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  auth_user_id: string | null;
  status: string;
  username: string | null;
  org_id: string | null;
  department: string | null;
  clearance_tier_required: number;
}): User {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    auth_user_id: row.auth_user_id,
    username: row.username,
    org_id: row.org_id,
    department: row.department,
    clearance_tier_required: row.clearance_tier_required,
    status: row.status as User["status"],
  };
}

export class DrizzleUserProvisioningRepository implements UserProvisioningRepository {
  constructor(private readonly db: DbInstance) {}

  async provisionUserWithAccess(
    tenantId: string,
    input: ProvisionUserWithAccessInput,
  ): Promise<User> {
    try {
      return await this.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(users)
          .values({
            id: input.userId,
            iq_tenant_id: tenantId,
            full_name: input.user.full_name,
            email: input.user.email ?? null,
            phone: input.user.phone ?? null,
            username: input.user.username ?? null,
            org_id: input.user.org_id ?? null,
            department: input.user.department ?? null,
            clearance_tier_required:
              input.user.clearance_tier_required !== undefined
                ? clampClearanceTierRequired(input.user.clearance_tier_required)
                : 0,
          })
          .returning(userColumns);

        if (!inserted) {
          throw new UnexpectedPersistenceError();
        }

        const [linked] = await tx
          .update(users)
          .set({ auth_user_id: input.authUserId, updated_at: new Date() })
          .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, inserted.id)))
          .returning(userColumns);

        if (!linked) {
          throw new UnexpectedPersistenceError();
        }

        const userId = linked.id;

        if (input.manualCapabilityIds.length > 0) {
          await replaceManualCapabilityGrantsInTx(tx, tenantId, {
            userId,
            capabilityIds: input.manualCapabilityIds,
            actorId: input.actorId,
          });
        }

        for (const grant of input.roleTemplateGrants) {
          await applyRoleTemplateInTx(tx, tenantId, {
            userId,
            roleId: grant.roleId,
            capabilityIds: grant.capabilityIds,
            actorId: input.actorId,
          });
        }

        if (input.pharmacyStoreAssignments && input.pharmacyStoreAssignments.length > 0) {
          const now = new Date();
          await tx.insert(pharmacy_store_assignments).values(
            input.pharmacyStoreAssignments.map((assignment) => ({
              id: randomUUID(),
              iq_tenant_id: tenantId,
              user_id: userId,
              store_id: assignment.store_id,
              assignment_kind: assignment.assignment_kind,
              created_at: now,
              updated_at: now,
            })),
          );
        }

        return rowToUser(linked);
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new DuplicateUsernameError(input.user.username ?? undefined);
      }
      throw error;
    }
  }
}

type Tx = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

async function replaceManualCapabilityGrantsInTx(
  tx: Tx,
  tenantId: string,
  input: {
    userId: string;
    capabilityIds: string[];
    actorId: string | null;
  },
): Promise<void> {
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
    .filter((row) => row.grant_source === "manual" && !desiredIds.includes(row.capability_id))
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

  const missingCapabilityIds = desiredIds.filter(
    (capabilityId) => !activeByCapabilityId.has(capabilityId),
  );
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
}

async function applyRoleTemplateInTx(
  tx: Tx,
  tenantId: string,
  input: {
    userId: string;
    roleId: string;
    capabilityIds: string[];
    actorId: string | null;
  },
): Promise<void> {
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

  const [roleRow] = await tx
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.iq_tenant_id, tenantId), eq(roles.id, input.roleId)))
    .limit(1);

  if (!roleRow) {
    throw new UnexpectedPersistenceError();
  }
}
