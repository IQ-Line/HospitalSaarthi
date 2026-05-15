import type { EventBus } from "@hims/ts-sdk-events";
import { normalizeRoleCode } from "../domain/normalize-role-code.js";
import { ValidationError } from "../domain/errors.js";
import type { CreateRoleInput, Role, RoleRepository } from "../ports/index.js";

export type CreateRoleDeps = {
  roleRepository: RoleRepository;
  eventBus: EventBus;
};

export type CreateRoleContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

export async function createRole(
  deps: CreateRoleDeps,
  _ctx: CreateRoleContext,
  input: CreateRoleInput,
): Promise<Role> {
  if (typeof input.code !== "string") throw new ValidationError("role_code_invalid_type");
  if (typeof input.display_name !== "string") {
    throw new ValidationError("role_display_name_invalid_type");
  }
  const code = normalizeRoleCode(input.code);
  if (code.length === 0) throw new ValidationError("role_code_empty");
  if (input.display_name.trim().length === 0) throw new ValidationError("role_display_name_empty");
  return deps.roleRepository.createRole(_ctx.tenantId, {
    ...input,
    code,
    display_name: input.display_name.trim(),
  });
}
