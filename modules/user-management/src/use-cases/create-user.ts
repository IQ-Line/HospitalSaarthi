import type { UserRepo } from "../ports.js";
import type { EventBus } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import type { User, CreateUserData } from "../domain/user.types.js";

interface CreateUserInput {
  iq_tenant_id: string;
  username: string;
  full_name: string;
  password: string;
  email?: string | null;
  phone?: string | null;
  kind?: CreateUserData["kind"];
  employee_id?: string | null;
  recovery_tier?: CreateUserData["recovery_tier"];
  created_by: string;
  correlation_id: string;
}

export async function createUser(
  repo: UserRepo,
  eventBus: EventBus,
  input: CreateUserInput,
): Promise<User> {
  // TODO: When better-auth integration lands, create ba_users record first
  // (username + synthetic email + password hash), then link via auth_user_id.

  const user = await repo.create({
    iq_tenant_id: input.iq_tenant_id,
    full_name: input.full_name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    kind: input.kind,
    employee_id: input.employee_id ?? null,
    recovery_tier: input.recovery_tier,
    created_by: input.created_by,
  });

  await eventBus.publish(
    createEnvelope({
      event_type: "user-management.user.created",
      source_module: "user-management",
      iq_tenant_id: input.iq_tenant_id,
      correlation_id: input.correlation_id,
      actor_id: input.created_by,
      schema_version: "1.0.0",
      payload: {
        user_id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        kind: user.kind,
        status: user.status,
      },
    }),
  );

  return user;
}
