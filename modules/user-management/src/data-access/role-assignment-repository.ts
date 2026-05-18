import type { DbInstance } from "@hims/ts-sdk-db";
import type {
  AssignRoleInput,
  RoleAssignment,
  RoleAssignmentRef,
  RoleAssignmentRepository,
} from "../ports/index.js";
import { DuplicateRoleAssignmentError, UnexpectedPersistenceError } from "../domain/errors.js";
import { role_assignments } from "../schema/tables.js";
import { and, eq } from "drizzle-orm";

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

function rowToRoleAssignment(row: {
  id: string;
  user_id: string;
  role_id: string;
}): RoleAssignment {
  return { id: row.id, user_id: row.user_id, role_id: row.role_id };
}

export class DrizzleRoleAssignmentRepository implements RoleAssignmentRepository {
  constructor(private readonly db: DbInstance) {}

  async assignRole(tenantId: string, input: AssignRoleInput): Promise<RoleAssignment> {
    try {
      const [row] = await this.db
        .insert(role_assignments)
        .values({
          iq_tenant_id: tenantId,
          user_id: input.user_id,
          role_id: input.role_id,
        })
        .returning({
          id: role_assignments.id,
          user_id: role_assignments.user_id,
          role_id: role_assignments.role_id,
        });

      if (!row) {
        throw new UnexpectedPersistenceError();
      }
      return rowToRoleAssignment(row);
    } catch (e) {
      if (isPostgresUniqueViolation(e)) {
        throw new DuplicateRoleAssignmentError();
      }
      throw e;
    }
  }

  async revokeRole(
    tenantId: string,
    input: AssignRoleInput,
  ): Promise<RoleAssignment | null> {
    const [row] = await this.db
      .delete(role_assignments)
      .where(
        and(
          eq(role_assignments.iq_tenant_id, tenantId),
          eq(role_assignments.user_id, input.user_id),
          eq(role_assignments.role_id, input.role_id),
        ),
      )
      .returning({
        id: role_assignments.id,
        user_id: role_assignments.user_id,
        role_id: role_assignments.role_id,
      });

    return row ? rowToRoleAssignment(row) : null;
  }

  async listAssignments(): Promise<RoleAssignmentRef[]> {
    return this.db
      .select({
        id: role_assignments.id,
        tenant_id: role_assignments.iq_tenant_id,
        user_id: role_assignments.user_id,
        role_id: role_assignments.role_id,
      })
      .from(role_assignments);
  }

  async listAssignmentsByUser(
    tenantId: string,
    userId: string,
  ): Promise<RoleAssignmentRef[]> {
    return this.db
      .select({
        id: role_assignments.id,
        tenant_id: role_assignments.iq_tenant_id,
        user_id: role_assignments.user_id,
        role_id: role_assignments.role_id,
      })
      .from(role_assignments)
      .where(
        and(
          eq(role_assignments.iq_tenant_id, tenantId),
          eq(role_assignments.user_id, userId),
        ),
      );
  }

  async listAssignmentsByRole(
    tenantId: string,
    roleId: string,
  ): Promise<RoleAssignmentRef[]> {
    return this.db
      .select({
        id: role_assignments.id,
        tenant_id: role_assignments.iq_tenant_id,
        user_id: role_assignments.user_id,
        role_id: role_assignments.role_id,
      })
      .from(role_assignments)
      .where(
        and(
          eq(role_assignments.iq_tenant_id, tenantId),
          eq(role_assignments.role_id, roleId),
        ),
      );
  }

  async listAssignmentsByTenant(
    tenantId: string,
    filter?: Readonly<{ userId?: string; roleId?: string }>,
  ): Promise<RoleAssignmentRef[]> {
    const predicates = [eq(role_assignments.iq_tenant_id, tenantId)];
    if (filter?.userId) {
      predicates.push(eq(role_assignments.user_id, filter.userId));
    }
    if (filter?.roleId) {
      predicates.push(eq(role_assignments.role_id, filter.roleId));
    }
    return this.db
      .select({
        id: role_assignments.id,
        tenant_id: role_assignments.iq_tenant_id,
        user_id: role_assignments.user_id,
        role_id: role_assignments.role_id,
      })
      .from(role_assignments)
      .where(and(...predicates));
  }
}
