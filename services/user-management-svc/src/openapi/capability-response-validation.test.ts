import { describe, expect, it } from "vitest";
import { createResponseValidatorTable } from "./build-route-schema-table.js";
import { loadUserManagementOpenApiBundle } from "./load-openapi-bundle.js";

describe("Capability list response validation", () => {
  it("accepts null provenance fields from the runtime catalog", async () => {
    const bundle = await loadUserManagementOpenApiBundle();
    const validators = createResponseValidatorTable(bundle);
    const validate = validators.get("GET:/api/user-management/capabilities")?.get(200);
    expect(validate).toBeDefined();

    const payload = [
      {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d611",
        capability_key: "users:users:read",
        module: "user-management",
        feature: "users",
        action: "read",
        display_name: "Read users",
        description: "Read individual user records.",
        is_active: true,
        source_module_slug: null,
        source_permission_slug: null,
        source_catalog: null,
      },
    ];

    expect(validate!(payload)).toBe(true);
    expect(validate!.errors).toBeNull();
  });
});
