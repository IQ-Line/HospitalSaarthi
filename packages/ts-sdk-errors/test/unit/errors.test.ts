import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../src/index.js";

describe("AppError hierarchy", () => {
  it("maps each subclass to its status/code/title", () => {
    const cases: Array<[AppError, number, string, string]> = [
      [new NotFoundError("patient 123 not found"), 404, "NOT_FOUND", "Resource Not Found"],
      [new ValidationError("bad input"), 400, "VALIDATION_FAILED", "Validation Failed"],
      [new ConflictError("uhid already exists"), 409, "CONFLICT", "Conflict"],
      [new UnauthorizedError("token expired"), 401, "UNAUTHORIZED", "Unauthorized"],
      [new ForbiddenError("not allowed"), 403, "FORBIDDEN", "Forbidden"],
    ];
    for (const [err, status, code, title] of cases) {
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
      expect(err.status).toBe(status);
      expect(err.code).toBe(code);
      expect(err.title).toBe(title);
      expect(err.name).toBe(err.constructor.name);
    }
  });

  it("renders a full RFC 7807 problem with instance and detail", () => {
    const problem = new NotFoundError("patient 123 not found").toProblem("/api/registration/v1/patients/123");
    expect(problem).toEqual({
      type: "urn:hims:error:not_found",
      title: "Resource Not Found",
      status: 404,
      code: "NOT_FOUND",
      detail: "patient 123 not found",
      instance: "/api/registration/v1/patients/123",
    });
  });

  it("omits instance when not supplied", () => {
    const problem = new ConflictError("dup").toProblem();
    expect(problem.instance).toBeUndefined();
    expect(problem.detail).toBe("dup");
  });

  it("prefers explicit detail over message and preserves cause", () => {
    const cause = new Error("db unique violation");
    const err = new ConflictError("internal note", { detail: "UHID already registered", cause });
    expect(err.message).toBe("UHID already registered");
    expect(err.cause).toBe(cause);
    expect(err.toProblem().detail).toBe("UHID already registered");
  });

  it("folds extension members into the problem body", () => {
    const problem = new ForbiddenError("blocked", {
      extensions: { requiredCapability: "patients:read" },
    }).toProblem("/x");
    expect(problem["requiredCapability"]).toBe("patients:read");
    expect(problem.status).toBe(403);
  });

  it("ValidationError surfaces field violations under `errors`", () => {
    const problem = new ValidationError("invalid body", {
      errors: [
        { field: "phone_number", message: "must be a valid mobile" },
        { field: "gender", message: "required" },
      ],
    }).toProblem("/api/registration/v1/registrations");
    expect(problem["errors"]).toEqual([
      { field: "phone_number", message: "must be a valid mobile" },
      { field: "gender", message: "required" },
    ]);
  });

  it("ValidationError with no violations does not add an empty `errors` key", () => {
    const problem = new ValidationError("invalid").toProblem();
    expect(problem["errors"]).toBeUndefined();
  });
});
