import type { AssignRoleInput, RoleAssignment, RoleAssignmentRepository } from "../ports.js";
import { DuplicateRoleAssignmentError } from "../domain/errors.js";
import { role_assignments } from "../schema/tables.js";
import type { UserManagementDb } from "./user-repository.js";

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
  constructor(private readonly db: UserManagementDb) {}

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
        throw new Error("assignRole: insert returned no row");
      }
      return rowToRoleAssignment(row);
    } catch (e) {
      if (isPostgresUniqueViolation(e)) {
        throw new DuplicateRoleAssignmentError();
      }
      throw e;
    }
  }
}
