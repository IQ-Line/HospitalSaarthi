import { describe, expect, it } from "vitest";
import { IntegrationStateError } from "../domain/errors.js";
import { InMemoryIntegrationApiKeyRepository } from "../data-access/in-memory-integration-api-key-repository.js";
import { InMemoryIntegrationRepository } from "../data-access/in-memory-integration-repository.js";
import type { UserManagementPartnerGateway } from "../ports.js";
import { createIntegration } from "./create-integration.js";
import { activateIntegration } from "./activate-integration.js";
import { disableIntegration } from "./disable-integration.js";
import { issueApiKey } from "./issue-api-key.js";
import { reactivateIntegration } from "./reactivate-integration.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACTOR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function createTrackingGateway(): UserManagementPartnerGateway & {
  deactivated: string[];
  reactivated: string[];
} {
  const state = { deactivated: [] as string[], reactivated: [] as string[] };
  return {
    deactivated: state.deactivated,
    reactivated: state.reactivated,
    async provisionPartnerPrincipal(_ctx, input) {
      return {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        full_name: input.integration_display_name,
        kind: "partner",
        integration_id: input.integration_id,
        status: "active",
      };
    },
    async deactivatePartnerPrincipal(_ctx, integrationId) {
      state.deactivated.push(integrationId);
      return {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        full_name: "Partner",
        kind: "partner",
        integration_id: integrationId,
        status: "inactive",
      };
    },
    async reactivatePartnerPrincipal(_ctx, integrationId) {
      state.reactivated.push(integrationId);
      return {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        full_name: "Partner",
        kind: "partner",
        integration_id: integrationId,
        status: "active",
      };
    },
  };
}

describe("integration lifecycle", () => {
  it("runs draft → active → disabled → active with API key issue/revoke on disable", async () => {
    const integrationRepository = new InMemoryIntegrationRepository();
    const integrationApiKeyRepository = new InMemoryIntegrationApiKeyRepository();
    const gateway = createTrackingGateway();
    const shared = {
      integrationRepository,
      integrationApiKeyRepository,
      userManagementPartnerGateway: gateway,
    };

    const draft = await createIntegration(
      { integrationRepository },
      { tenantId: TENANT, actorId: ACTOR },
      {
        integration_type: "partner",
        display_name: "Lifecycle Partner",
        config: {
          allowedOperations: ["registration.listRegistrations", "empi.getPatient"],
        },
      },
    );

    const active = await activateIntegration(
      shared,
      { tenantId: TENANT, actorId: ACTOR, authorization: "Bearer t" },
      draft.integration_id,
    );
    expect(active.status).toBe("active");

    const issued = await issueApiKey(
      { ...shared, apiKeyEnvironment: "test" as const },
      { tenantId: TENANT, actorId: ACTOR },
      active.integration_id,
    );
    expect(issued.plaintext_secret.startsWith("hims_test_")).toBe(true);

    const disabled = await disableIntegration(
      shared,
      { tenantId: TENANT, actorId: ACTOR, authorization: "Bearer t" },
      active.integration_id,
    );
    expect(disabled.status).toBe("disabled");
    expect(gateway.deactivated).toContain(active.integration_id);

    const keys = await integrationApiKeyRepository.listByIntegration(
      TENANT,
      active.integration_id,
    );
    expect(keys.every((key) => key.status === "revoked")).toBe(true);

    const reactivated = await reactivateIntegration(
      shared,
      { tenantId: TENANT, actorId: ACTOR, authorization: "Bearer t" },
      active.integration_id,
    );
    expect(reactivated.status).toBe("active");
    expect(gateway.reactivated).toContain(active.integration_id);
  });

  it("rejects API key issue on draft integration", async () => {
    const integrationRepository = new InMemoryIntegrationRepository();
    const draft = await createIntegration(
      { integrationRepository },
      { tenantId: TENANT, actorId: ACTOR },
      {
        integration_type: "partner",
        display_name: "Draft Only",
        config: { allowedOperations: ["empi.getPatient"] },
      },
    );

    await expect(
      issueApiKey(
        {
          integrationRepository,
          integrationApiKeyRepository: new InMemoryIntegrationApiKeyRepository(),
          apiKeyEnvironment: "test",
        },
        { tenantId: TENANT, actorId: ACTOR },
        draft.integration_id,
      ),
    ).rejects.toBeInstanceOf(IntegrationStateError);
  });
});
