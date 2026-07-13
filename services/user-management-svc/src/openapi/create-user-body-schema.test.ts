import { describe, expect, it } from "vitest";
import { compileRequestBodyValidator } from "./build-route-schema-table.js";
import { loadUserManagementOpenApiBundle } from "./load-openapi-bundle.js";

describe("POST /users OpenAPI request body", () => {
  it("keeps pharmacy_store_access when Fastify/Ajv removes additional properties", async () => {
    const bundle = await loadUserManagementOpenApiBundle();
    const validate = compileRequestBodyValidator(
      bundle,
      "POST",
      "/api/user-management/users",
    );
    expect(validate).not.toBeNull();

    const body: Record<string, unknown> = {
      full_name: "Pharmacist",
      email: "pharma@gmail.com",
      password: "password123",
      pharmacy_store_access: {
        primary_store_id: "5efaafca-be32-4eff-92a5-10c215427952",
        secondary_store_ids: [],
      },
    };

    expect(validate!(body)).toBe(true);
    expect(body.pharmacy_store_access).toEqual({
      primary_store_id: "5efaafca-be32-4eff-92a5-10c215427952",
      secondary_store_ids: [],
    });
  });
});
