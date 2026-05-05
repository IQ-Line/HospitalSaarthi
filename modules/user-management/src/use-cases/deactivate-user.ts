import type { UserRepo } from "../ports.js";
import type { EventBus } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import type { User } from "../domain/user.types.js";

interface DeactivateUserInput {
  iq_tenant_id: string;
  user_id: string;
  deactivated_by: string;
  correlation_id: string;
}

export async function deactivateUser(
  repo: UserRepo,
  eventBus: EventBus,
  input: DeactivateUserInput,
): Promise<User | undefined> {
  const user = await repo.deactivate(
    input.iq_tenant_id,
    input.user_id,
    input.deactivated_by,
  );

  if (!user) return undefined;

  await eventBus.publish(
    createEnvelope({
      event_type: "user-management.user.deactivated",
      source_module: "user-management",
      iq_tenant_id: input.iq_tenant_id,
      correlation_id: input.correlation_id,
      actor_id: input.deactivated_by,
      schema_version: "1.0.0",
      payload: {
        user_id: user.id,
        full_name: user.full_name,
        previous_status: "active",
        new_status: user.status,
      },
    }),
  );

  return user;
}
