import { describe, expect, it } from "vitest";
import { InMemoryIntegrationApiKeyRepository } from "../data-access/in-memory-integration-api-key-repository.js";
import { InMemoryIntegrationRepository } from "../data-access/in-memory-integration-repository.js";
import type { UserManagementPartnerGateway } from "../ports.js";
import { createIntegration } from "./create-integration.js";
import { activateIntegration } from "./activate-integration.js";

const TENANT = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";

function createMockGateway(): UserManagementPartnerGateway {
  return {
    async provisionPartnerPrincipal(_ctx, input) {
      return {
        id: "33333333-3333-4333-8333-333333333333",
        full_name: input.integration_display_name,
        kind: "partner",
        integration_id: input.integration_id,
        status: "active",
      };
    },
    async deactivatePartnerPrincipal() {
      return null;
    },
    async reactivatePartnerPrincipal() {
      return null;
    },
  };
}

describe("activateIntegration", () => {
  it("provisions partner principal and strips suggestedCapabilityKeys", async () => {
    const integrationRepository = new InMemoryIntegrationRepository();
    const deps = {
      integrationRepository,
      integrationApiKeyRepository: new InMemoryIntegrationApiKeyRepository(),
      userManagementPartnerGateway: createMockGateway(),
    };

    const draft = await createIntegration(
      { integrationRepository },
      { tenantId: TENANT, actorId: ACTOR },
      {
        integration_type: "partner",
        display_name: "Smart Report Partner",
        config: {
          allowedOperations: ["registration.listRegistrations", "empi.getPatient"],
        },
      },
    );
    expect(draft.config.suggestedCapabilityKeys?.length).toBeGreaterThan(0);

    const activated = await activateIntegration(
      deps,
      {
        tenantId: TENANT,
        actorId: ACTOR,
        authorization: "Bearer test-token",
      },
      draft.integration_id,
    );

    expect(activated.status).toBe("active");
    expect(activated.partner_principal_id).toBe("33333333-3333-4333-8333-333333333333");
    expect(activated.config.suggestedCapabilityKeys).toBeUndefined();
    expect(activated.config.allowedOperations).toContain("empi.getPatient");
  });
});
