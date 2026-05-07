import type { CreateEnvelopeInput, EventBus } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import { USER_MANAGEMENT_EVENT_ROLE_ASSIGNED } from "../events/constants.js";
import { mapAuthContextToEventEnvelope } from "../events/map-auth-context-to-envelope.js";
import type { AssignRoleInput, RoleAssignment, RoleAssignmentRepository } from "../ports/index.js";

export type AssignRoleDeps = {
  roleAssignmentRepository: RoleAssignmentRepository;
  eventBus: EventBus;
};

export type AssignRoleContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

/**
 * Assigns a role to a user within a tenant and publishes `user-management.role.assigned`.
 */
export async function assignRole(
  deps: AssignRoleDeps,
  ctx: AssignRoleContext,
  input: AssignRoleInput,
): Promise<RoleAssignment> {
  if (
    typeof input.user_id !== "string" ||
    input.user_id.trim() === "" ||
    typeof input.role_id !== "string" ||
    input.role_id.trim() === ""
  ) {
    throw new Error("user_id and role_id are required");
  }
  const assignment = await deps.roleAssignmentRepository.assignRole(ctx.tenantId, input);
  const envelopeIds = mapAuthContextToEventEnvelope({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
  });
  const envelopeInput: CreateEnvelopeInput<{
    id: string;
    user_id: string;
    role_id: string;
  }> = {
    event_type: USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
    source_module: "user-management",
    iq_tenant_id: envelopeIds.iq_tenant_id,
    correlation_id: ctx.correlationId,
    actor_id: envelopeIds.actor_id,
    schema_version: "1.0.0",
    payload: {
      id: assignment.id,
      user_id: assignment.user_id,
      role_id: assignment.role_id,
    },
  };
  await deps.eventBus.publish(createEnvelope(envelopeInput));
  return assignment;
}
