import { randomUUID } from "node:crypto";
import type {
  AssignRoleInput,
  RoleAssignment,
  RoleAssignmentRef,
  RoleAssignmentRepository,
} from "../ports/index.js";
import { DuplicateRoleAssignmentError } from "../domain/errors.js";

function assignmentKey(tenantId: string, userId: string, roleId: string): string {
  return `${tenantId}:${userId}:${roleId}`;
}

/** In-memory {@link RoleAssignmentRepository} using a Map keyed by tenant + user + role. */
export class InMemoryRoleAssignmentRepository implements RoleAssignmentRepository {
  private readonly assignments = new Map<string, RoleAssignment>();
  private readonly assignmentRefs: RoleAssignmentRef[] = [];

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
    this.assignmentRefs.push({
      id: assignment.id,
      tenant_id: tenantId,
      user_id: input.user_id,
      role_id: input.role_id,
    });
    return assignment;
  }

  async revokeRole(tenantId: string, input: AssignRoleInput): Promise<RoleAssignment | null> {
    const key = assignmentKey(tenantId, input.user_id, input.role_id);
    const assignment = this.assignments.get(key) ?? null;
    if (assignment === null) {
      return null;
    }

    this.assignments.delete(key);
    const idx = this.assignmentRefs.findIndex(
      (ref) =>
        ref.tenant_id === tenantId &&
        ref.user_id === input.user_id &&
        ref.role_id === input.role_id,
    );
    if (idx >= 0) {
      this.assignmentRefs.splice(idx, 1);
    }

    return assignment;
  }

  async listAssignments(): Promise<RoleAssignmentRef[]> {
    return [...this.assignmentRefs];
  }

  async listAssignmentsByUser(tenantId: string, userId: string): Promise<RoleAssignmentRef[]> {
    return this.assignmentRefs.filter(
      (assignment) => assignment.tenant_id === tenantId && assignment.user_id === userId,
    );
  }

  async listAssignmentsByRole(tenantId: string, roleId: string): Promise<RoleAssignmentRef[]> {
    return this.assignmentRefs.filter(
      (assignment) => assignment.tenant_id === tenantId && assignment.role_id === roleId,
    );
  }

  async listAssignmentsByTenant(
    tenantId: string,
    filter?: Readonly<{ userId?: string; roleId?: string }>,
  ): Promise<RoleAssignmentRef[]> {
    return this.assignmentRefs.filter((assignment) => {
      if (assignment.tenant_id !== tenantId) return false;
      if (filter?.userId && assignment.user_id !== filter.userId) return false;
      if (filter?.roleId && assignment.role_id !== filter.roleId) return false;
      return true;
    });
  }
}
