import { describe, expect, it } from "vitest";
import {
  DuplicateUserRoleTemplateError,
  InvalidRoleSeedError,
  RbacIntegrityViolationError,
  RoleNotFoundError,
  TenantMismatchError,
  UnexpectedPersistenceError,
  UserManagementError,
  UserNotFoundError,
  ValidationError,
} from "./errors.js";

function assertUserManagementError(err: UserManagementError): void {
  expect(err).toBeInstanceOf(UserManagementError);
  expect(err).toBeInstanceOf(Error);
  expect(typeof err.code).toBe("string");
  expect(err.code.length).toBeGreaterThan(0);
  expect(typeof err.message).toBe("string");
}

describe("UserManagementError hierarchy", () => {
  it("all exported domain errors extend UserManagementError", () => {
    assertUserManagementError(new ValidationError("full_name_empty"));
    assertUserManagementError(new UserNotFoundError("u1"));
    assertUserManagementError(new RoleNotFoundError("r1"));
    assertUserManagementError(new DuplicateUserRoleTemplateError());
    assertUserManagementError(new TenantMismatchError());
    assertUserManagementError(new RbacIntegrityViolationError("orphan_user_role_template"));
    assertUserManagementError(new UnexpectedPersistenceError());
    assertUserManagementError(new InvalidRoleSeedError());
  });

  it("supports optional cause without affecting instanceof narrowing", () => {
    const cause = new Error("db");
    const err = new UnexpectedPersistenceError({ cause });
    expect(err).toBeInstanceOf(UserManagementError);
    expect(err.cause).toBe(cause);
  });

  it("ValidationError exposes issue alongside base code", () => {
    const err = new ValidationError("apply_role_template_ids_invalid");
    expect(err.issue).toBe("apply_role_template_ids_invalid");
    expect(err.code).toBe("INVALID_INPUT");
  });

  it("base supports retryable metadata for future workflows", () => {
    const err = new UserManagementError("X", "y", { retryable: true });
    expect(err.retryable).toBe(true);
  });
});
