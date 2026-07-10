import { describe, expect, it } from "vitest";
import { assertUserCanAuthenticate } from "../../../src/authn/assert-user-can-authenticate.js";
import { UserAccountDisabledError } from "../../../src/domain/errors.js";

describe("assertUserCanAuthenticate", () => {
  it("allows active users", () => {
    expect(() => assertUserCanAuthenticate({ status: "active" })).not.toThrow();
  });

  it("rejects inactive users", () => {
    expect(() => assertUserCanAuthenticate({ status: "inactive" })).toThrow(
      UserAccountDisabledError,
    );
  });

  it("rejects suspended users", () => {
    expect(() => assertUserCanAuthenticate({ status: "suspended" })).toThrow(
      UserAccountDisabledError,
    );
  });
});
