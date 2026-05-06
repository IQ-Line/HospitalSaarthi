import { randomUUID } from "node:crypto";
import type { AssignRoleInput, RoleAssignment, RoleAssignmentRepository } from "../ports/index.js";
import { DuplicateRoleAssignmentError } from "../domain/errors.js";

function assignmentKey(tenantId: string, userId: string, roleId: string): string {
  return `${tenantId}:${userId}:${roleId}`;
}

/** In-memory {@link RoleAssignmentRepository} using a Map keyed by tenant + user + role. */
export class InMemoryRoleAssignmentRepository implements RoleAssignmentRepository {
  private readonly assignments = new Map<string, RoleAssignment>();

  async assignRole(tenantId: string, input: AssignRoleInput): Promise<RoleAssignment> {
    const key = assignmentKey(tenantId, input.user_id, input.role_id);
    if (this.assignments.has(key)) {
      throw new DuplicateRoleAssignmentError();
    }
    const assignment: RoleAssignment = {
      id: randomUUID(),
      user_id: input.user_id,
      role_id: input.role_id,
    };
    this.assignments.set(key, assignment);
    return assignment;
  }
}
