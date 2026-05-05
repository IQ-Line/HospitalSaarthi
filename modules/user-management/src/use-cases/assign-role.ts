import type { RoleRepo } from "../ports.js";
import type { EventBus } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import type { RoleAssignment, AssignRoleData } from "../domain/role.types.js";

interface AssignRoleInput {
  iq_tenant_id: string;
  user_id: string;
  role_id: string;
  scope_type?: string | null;
  scope_id?: string | null;
  assigned_by: string;
  correlation_id: string;
}

export async function assignRole(
  repo: RoleRepo,
  eventBus: EventBus,
  input: AssignRoleInput,
): Promise<RoleAssignment> {
  const data: AssignRoleData = {
    iq_tenant_id: input.iq_tenant_id,
    user_id: input.user_id,
    role_id: input.role_id,
    scope_type: input.scope_type ?? null,
    scope_id: input.scope_id ?? null,
    assigned_by: input.assigned_by,
  };

  const assignment = await repo.assignToUser(data);

  await eventBus.publish(
    createEnvelope({
      event_type: "user-management.role-assignment.created",
      source_module: "user-management",
      iq_tenant_id: input.iq_tenant_id,
      correlation_id: input.correlation_id,
      actor_id: input.assigned_by,
      schema_version: "1.0.0",
      payload: {
        assignment_id: assignment.id,
        user_id: assignment.user_id,
        role_id: assignment.role_id,
        scope_type: assignment.scope_type,
        scope_id: assignment.scope_id,
      },
    }),
  );

  return assignment;
}
