import type { EventBus } from "@hims/ts-sdk-events";
import { normalizeRoleCode } from "../domain/normalize-role-code.js";
import { normalizeRoleType } from "../domain/normalize-role-type.js";
import { isReservedRoleCode } from "../domain/reserved-role-codes.js";
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
  /**
   * Whether the caller may set the platform-controlled `is_system` flag. Only the
   * platform super-admin (operator) may — tenant onboarding creates the tenant-admin
   * system role as super-admin. Any other caller's `is_system` is ignored (forced false),
   * so a tenant cannot self-mint a system role. Resolved from the verified principal at
   * the HTTP edge; never trusted from the request body.
   */
  canManageSystemFlag: boolean;
};

export async function createRole(
  deps: CreateRoleDeps,
  _ctx: CreateRoleContext,
  input: CreateRoleInput,
): Promise<Role> {
  if (typeof input.code !== "string") throw new ValidationError("role_code_invalid_type");
  if (typeof input.role_type !== "string") throw new ValidationError("role_type_invalid_type");
  if (typeof input.display_name !== "string") {
    throw new ValidationError("role_display_name_invalid_type");
  }
  const code = normalizeRoleCode(input.code);
  const role_type = normalizeRoleType(input.role_type);
  if (code.length === 0) throw new ValidationError("role_code_empty");
  if (isReservedRoleCode(code)) throw new ValidationError("role_code_reserved");
  if (role_type.length === 0) throw new ValidationError("role_type_empty");
  // role_type is ALSO projected into the principal's role codes (see
  // drizzle-principal-role-projection-repository), so it reaches the same cross-tenant
  // bypass as code — reserve it on the same axis.
  if (isReservedRoleCode(role_type)) throw new ValidationError("role_type_reserved");
  if (input.display_name.trim().length === 0) throw new ValidationError("role_display_name_empty");
  return deps.roleRepository.createRole(_ctx.tenantId, {
    ...input,
    code,
    role_type,
    display_name: input.display_name.trim(),
    // `is_system` is platform-controlled: honor it only for a platform super-admin; every
    // other caller's value is discarded and the role is created non-system. (Placed after
    // the spread so it overrides any body-supplied `is_system`.)
    is_system: _ctx.canManageSystemFlag ? (input.is_system ?? false) : false,
  });
}
