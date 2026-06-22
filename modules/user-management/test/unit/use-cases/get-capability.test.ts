import { describe, expect, it } from "vitest";
import { InMemoryCapabilityRepository } from "../../../src/data-access/in-memory-capability-repository.js";
import { getCapabilityById } from "../../../src/use-cases/get-capability.js";

describe("getCapabilityById", () => {
  it("returns the canonical capability by id", async () => {
    const repo = new InMemoryCapabilityRepository([
      {
        capability: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d490",
          capability_key: "user-roles:user-roles:read",
          module: "user-roles",
          feature: "roles",
          action: "read",
          display_name: "Read roles",
          description: "Read tenant-scoped roles.",
          is_active: true,
        },
      },
    ]);

    await expect(
      getCapabilityById({ capabilityRepository: repo }, "f47ac10b-58cc-4372-a567-0e02b2c3d490"),
    ).resolves.toEqual(
      expect.objectContaining({
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d490",
        capability_key: "user-roles:user-roles:read",
      }),
    );
  });

  it("returns null when the catalog does not contain the capability id", async () => {
    const repo = new InMemoryCapabilityRepository();

    await expect(
      getCapabilityById({ capabilityRepository: repo }, "f47ac10b-58cc-4372-a567-0e02b2c3d491"),
    ).resolves.toBeNull();
  });
});
