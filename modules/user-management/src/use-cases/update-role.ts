import { normalizeRoleCode } from "../domain/normalize-role-code.js";
import { normalizeRoleType } from "../domain/normalize-role-type.js";
import { ValidationError } from "../domain/errors.js";
import type { Role, RoleRepository, UpdateRoleInput } from "../ports/index.js";

export type UpdateRoleDeps = {
  roleRepository: RoleRepository;
};

export async function updateRole(
  deps: UpdateRoleDeps,
  tenantId: string,
  roleId: string,
  input: UpdateRoleInput,
): Promise<Role | null> {
  if (input.code !== undefined) {
    if (typeof input.code !== "string") throw new ValidationError("role_code_invalid_type");
    const code = normalizeRoleCode(input.code);
    if (code.length === 0) throw new ValidationError("role_code_empty");
    input = { ...input, code };
  }
  if (input.role_type !== undefined) {
    if (typeof input.role_type !== "string") throw new ValidationError("role_type_invalid_type");
    const role_type = normalizeRoleType(input.role_type);
    if (role_type.length === 0) throw new ValidationError("role_type_empty");
    input = { ...input, role_type };
  }
  if (input.display_name !== undefined) {
    if (typeof input.display_name !== "string") {
      throw new ValidationError("role_display_name_invalid_type");
    }
    if (input.display_name.trim().length === 0) {
      throw new ValidationError("role_display_name_empty");
    }
    input = { ...input, display_name: input.display_name.trim() };
  }
  return deps.roleRepository.updateRole(tenantId, roleId, input);
}
