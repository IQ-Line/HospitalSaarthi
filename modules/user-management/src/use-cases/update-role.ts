import { normalizeRoleCode } from "../domain/normalize-role-code.js";
import { normalizeRoleType } from "../domain/normalize-role-type.js";
import { isReservedRoleCode } from "../domain/reserved-role-codes.js";
import { ValidationError } from "../domain/errors.js";
import type { Role, RoleRepository, UpdateRoleInput } from "../ports/index.js";

export type UpdateRoleDeps = {
  roleRepository: RoleRepository;
};

function validateUpdatedCode(code: unknown): string {
  if (typeof code !== "string") throw new ValidationError("role_code_invalid_type");
  const normalized = normalizeRoleCode(code);
  if (normalized.length === 0) throw new ValidationError("role_code_empty");
  if (isReservedRoleCode(normalized)) throw new ValidationError("role_code_reserved");
  return normalized;
}

function validateUpdatedRoleType(roleType: unknown): string {
  if (typeof roleType !== "string") throw new ValidationError("role_type_invalid_type");
  const normalized = normalizeRoleType(roleType);
  if (normalized.length === 0) throw new ValidationError("role_type_empty");
  // role_type is projected into principal role codes too — reserve it like code.
  if (isReservedRoleCode(normalized)) throw new ValidationError("role_type_reserved");
  return normalized;
}

function validateUpdatedDisplayName(displayName: unknown): string {
  if (typeof displayName !== "string") throw new ValidationError("role_display_name_invalid_type");
  const trimmed = displayName.trim();
  if (trimmed.length === 0) throw new ValidationError("role_display_name_empty");
  return trimmed;
}

export async function updateRole(
  deps: UpdateRoleDeps,
  tenantId: string,
  roleId: string,
  input: UpdateRoleInput,
): Promise<Role | null> {
  if (input.code !== undefined) {
    input = { ...input, code: validateUpdatedCode(input.code) };
  }
  if (input.role_type !== undefined) {
    input = { ...input, role_type: validateUpdatedRoleType(input.role_type) };
  }
  if (input.display_name !== undefined) {
    input = { ...input, display_name: validateUpdatedDisplayName(input.display_name) };
  }
  return deps.roleRepository.updateRole(tenantId, roleId, input);
}
