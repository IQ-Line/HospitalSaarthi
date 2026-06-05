import { describe, expect, it } from "vitest";
import { assertLoginablePlatformUser } from "./assert-loginable-platform-user.js";
import { PlatformUserMutationForbiddenError } from "./errors.js";
import type { User } from "./types.js";

const baseUser: User = {
  id: "user-1",
  full_name: "Human",
  status: "active",
};

describe("assertLoginablePlatformUser", () => {
  it("allows default human users", () => {
    expect(() => assertLoginablePlatformUser(baseUser)).not.toThrow();
  });

  it("rejects partner principals", () => {
    expect(() =>
      assertLoginablePlatformUser({ ...baseUser, kind: "partner", integration_id: "int-1" }),
    ).toThrow(PlatformUserMutationForbiddenError);
  });
});
