import { describe, expect, it } from "vitest";
import {
  DuplicateRoleAssignmentError,
  InvalidRoleSeedError,
  RoleNotFoundError,
  TenantMismatchError,
  UnexpectedPersistenceError,
  UserManagementError,
  UserNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import { resolveUserManagementHttpError } from "./map-user-management-error.js";

describe("resolveUserManagementHttpError", () => {
  const cid = "corr-1";

  it("maps UserNotFoundError to 404 USER_NOT_FOUND with stable shape", () => {
    const r = resolveUserManagementHttpError(new UserNotFoundError("u1"), cid);
    expect(r.status).toBe(404);
    expect(r.body).toEqual({
      code: "USER_NOT_FOUND",
      message: "User not found for this tenant.",
      correlation_id: cid,
    });
  });

  it("maps RoleNotFoundError to 404 ROLE_NOT_FOUND", () => {
    const r = resolveUserManagementHttpError(new RoleNotFoundError("r1"), cid);
    expect(r.status).toBe(404);
    expect(r.body.code).toBe("ROLE_NOT_FOUND");
    expect(r.body.correlation_id).toBe(cid);
  });

  it("maps ValidationError full_name_invalid_type to 400 INVALID_INPUT", () => {
    const r = resolveUserManagementHttpError(new ValidationError("full_name_invalid_type"), cid);
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("INVALID_INPUT");
  });

  it("maps ValidationError full_name_empty to 422 FULL_NAME_REQUIRED", () => {
    const r = resolveUserManagementHttpError(new ValidationError("full_name_empty"), cid);
    expect(r.status).toBe(422);
    expect(r.body.code).toBe("FULL_NAME_REQUIRED");
    expect(r.body.correlation_id).toBe(cid);
  });

  it("maps ValidationError assign_role_ids_invalid to 400 INVALID_INPUT", () => {
    const r = resolveUserManagementHttpError(new ValidationError("assign_role_ids_invalid"), cid);
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("INVALID_INPUT");
  });

  it("maps DuplicateRoleAssignmentError to 409", () => {
    const r = resolveUserManagementHttpError(new DuplicateRoleAssignmentError(), cid);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("ROLE_ASSIGNMENT_DUPLICATE");
  });

  it("maps TenantMismatchError to 400 TENANT_CONTEXT_MISMATCH", () => {
    const r = resolveUserManagementHttpError(new TenantMismatchError(), cid);
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("TENANT_CONTEXT_MISMATCH");
  });

  it("preserves correlation_id for unknown errors", () => {
    const r = resolveUserManagementHttpError(new Error("oops"), cid);
    expect(r.status).toBe(500);
    expect(r.body.code).toBe("INTERNAL_ERROR");
    expect(r.body.correlation_id).toBe(cid);
  });

  it("masks persistence/seed domain codes as INTERNAL_ERROR for clients", () => {
    const p = resolveUserManagementHttpError(new UnexpectedPersistenceError(), cid);
    expect(p.body).toEqual({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      correlation_id: cid,
    });
    const s = resolveUserManagementHttpError(new InvalidRoleSeedError(), cid);
    expect(s.body.code).toBe("INTERNAL_ERROR");
  });

  it("falls back to 500 for unknown UserManagementError code", () => {
    class AdHocError extends UserManagementError {
      constructor() {
        super("FUTURE_ERROR_CODE", "future");
      }
    }
    const r = resolveUserManagementHttpError(new AdHocError(), cid);
    expect(r.status).toBe(500);
    expect(r.body.code).toBe("FUTURE_ERROR_CODE");
    expect(r.body.message).toBe("future");
  });
});
