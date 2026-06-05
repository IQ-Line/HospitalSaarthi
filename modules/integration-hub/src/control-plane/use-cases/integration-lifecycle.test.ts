import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  IntegrationConflictError,
  IntegrationInvalidStateError,
  IntegrationNotFoundError,
} from "../domain/integration-errors.js";
import { InMemoryIntegrationApiKeysRepository } from "../data-access/in-memory-integration-api-keys.repository.js";
import { InMemoryIntegrationsRepository } from "../data-access/in-memory-integrations.repository.js";
import type { PartnerPrincipalGateway, PartnerPrincipalUser } from "../ports.js";
import { activateIntegration } from "./activate-integration.js";
import { createIntegration } from "./create-integration.js";
import { deleteIntegration } from "./delete-integration.js";
import { disableIntegration } from "./disable-integration.js";
import { issueApiKey } from "./issue-api-key.js";
import { reactivateIntegration } from "./reactivate-integration.js";

class FakePartnerGateway implements PartnerPrincipalGateway {
  readonly provisioned: string[] = [];
  readonly deactivated: string[] = [];
  readonly reactivated: string[] = [];

  async provision(input: {
    tenantId: string;
    integrationId: string;
  }): Promise<PartnerPrincipalUser> {
    this.provisioned.push(input.integrationId);
    return {
      id: randomUUID(),
      full_name: "Partner",
      status: "active",
    };
  }

  async deactivate(input: { integrationId: string }): Promise<PartnerPrincipalUser | null> {
    this.deactivated.push(input.integrationId);
    return { id: randomUUID(), full_name: "Partner", status: "inactive" };
  }

  async reactivate(input: { integrationId: string }): Promise<PartnerPrincipalUser | null> {
    this.reactivated.push(input.integrationId);
    return { id: randomUUID(), full_name: "Partner", status: "active" };
  }
}

describe("integration control plane lifecycle", () => {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const authHeader = "Bearer test-token";

  it("creates draft integration from catalog template", async () => {
    const integrationsRepository = new InMemoryIntegrationsRepository();
    const created = await createIntegration(
      { integrationsRepository },
      tenantId,
      actorId,
      { name: "Smart Report", integration_type: "smart_report" },
    );
    expect(created.status).toBe("draft");
    expect(created.config.allowedOperations).toContain("registration.listRegistrations");
    expect(created.config.capabilityKeys).toContain("empi:patient:read");
  });

  it("rejects duplicate integration names per tenant", async () => {
    const integrationsRepository = new InMemoryIntegrationsRepository();
    const deps = { integrationsRepository };
    await createIntegration(deps, tenantId, actorId, {
      name: "Duplicate",
      integration_type: "smart_report",
    });
    await expect(
      createIntegration(deps, tenantId, actorId, {
        name: "duplicate",
        integration_type: "smart_report",
      }),
    ).rejects.toBeInstanceOf(IntegrationConflictError);
  });

  it("activates draft integration and provisions partner principal", async () => {
    const integrationsRepository = new InMemoryIntegrationsRepository();
    const gateway = new FakePartnerGateway();
    const draft = await createIntegration(
      { integrationsRepository },
      tenantId,
      actorId,
      { name: "Activate Me", integration_type: "smart_report" },
    );

    const activated = await activateIntegration(
      { integrationsRepository, partnerPrincipalGateway: gateway },
      {
        tenantId,
        integrationId: draft.id,
        actorId,
        authorizationHeader: authHeader,
      },
    );

    expect(activated.status).toBe("active");
    expect(activated.partner_principal_id).toBeTruthy();
    expect(gateway.provisioned).toEqual([draft.id]);
  });

  it("disables active integration, revokes keys, and deactivates partner principal", async () => {
    const apiKeysRepository = new InMemoryIntegrationApiKeysRepository();
    const integrationsRepository = new InMemoryIntegrationsRepository(apiKeysRepository);
    const gateway = new FakePartnerGateway();
    const draft = await createIntegration(
      { integrationsRepository },
      tenantId,
      actorId,
      { name: "Disable Me", integration_type: "smart_report" },
    );
    const activated = await activateIntegration(
      { integrationsRepository, partnerPrincipalGateway: gateway },
      {
        tenantId,
        integrationId: draft.id,
        actorId,
        authorizationHeader: authHeader,
      },
    );
    await issueApiKey(
      { integrationsRepository, integrationApiKeysRepository: apiKeysRepository },
      {
        tenantId,
        integrationId: activated.id,
        label: "primary",
        actorId,
      },
    );

    const disabled = await disableIntegration(
      { integrationsRepository, partnerPrincipalGateway: gateway },
      {
        tenantId,
        integrationId: activated.id,
        actorId,
        authorizationHeader: authHeader,
      },
    );

    expect(disabled.status).toBe("disabled");
    expect(gateway.deactivated).toEqual([activated.id]);
    const keys = await apiKeysRepository.listByIntegration(tenantId, activated.id);
    expect(keys.every((key) => key.status === "revoked")).toBe(true);
  });

  it("reactivates disabled integration", async () => {
    const integrationsRepository = new InMemoryIntegrationsRepository();
    const gateway = new FakePartnerGateway();
    const draft = await createIntegration(
      { integrationsRepository },
      tenantId,
      actorId,
      { name: "Reactivate Me", integration_type: "smart_report" },
    );
    const activated = await activateIntegration(
      { integrationsRepository, partnerPrincipalGateway: gateway },
      {
        tenantId,
        integrationId: draft.id,
        actorId,
        authorizationHeader: authHeader,
      },
    );
    await disableIntegration(
      { integrationsRepository, partnerPrincipalGateway: gateway },
      {
        tenantId,
        integrationId: activated.id,
        actorId,
        authorizationHeader: authHeader,
      },
    );

    const reactivated = await reactivateIntegration(
      { integrationsRepository, partnerPrincipalGateway: gateway },
      {
        tenantId,
        integrationId: activated.id,
        actorId,
        authorizationHeader: authHeader,
      },
    );

    expect(reactivated.status).toBe("active");
    expect(gateway.reactivated).toEqual([activated.id]);
  });

  it("deletes draft-only integrations", async () => {
    const integrationsRepository = new InMemoryIntegrationsRepository();
    const apiKeysRepository = new InMemoryIntegrationApiKeysRepository();
    const draft = await createIntegration(
      { integrationsRepository },
      tenantId,
      actorId,
      { name: "Delete Me", integration_type: "smart_report" },
    );

    await deleteIntegration(
      { integrationsRepository, integrationApiKeysRepository: apiKeysRepository },
      tenantId,
      draft.id,
    );

    expect(await integrationsRepository.getById(tenantId, draft.id)).toBeNull();
  });

  it("rejects deleting active integrations", async () => {
    const integrationsRepository = new InMemoryIntegrationsRepository();
    const apiKeysRepository = new InMemoryIntegrationApiKeysRepository();
    const gateway = new FakePartnerGateway();
    const draft = await createIntegration(
      { integrationsRepository },
      tenantId,
      actorId,
      { name: "No Delete", integration_type: "smart_report" },
    );
    const activated = await activateIntegration(
      { integrationsRepository, partnerPrincipalGateway: gateway },
      {
        tenantId,
        integrationId: draft.id,
        actorId,
        authorizationHeader: authHeader,
      },
    );

    await expect(
      deleteIntegration(
        { integrationsRepository, integrationApiKeysRepository: apiKeysRepository },
        tenantId,
        activated.id,
      ),
    ).rejects.toBeInstanceOf(IntegrationInvalidStateError);
  });

  it("rejects updates on non-draft integrations", async () => {
    const integrationsRepository = new InMemoryIntegrationsRepository();
    const gateway = new FakePartnerGateway();
    const draft = await createIntegration(
      { integrationsRepository },
      tenantId,
      actorId,
      { name: "Frozen", integration_type: "smart_report" },
    );
    await activateIntegration(
      { integrationsRepository, partnerPrincipalGateway: gateway },
      {
        tenantId,
        integrationId: draft.id,
        actorId,
        authorizationHeader: authHeader,
      },
    );

    await expect(
      integrationsRepository.update(tenantId, draft.id, {
        name: "Renamed",
        updatedBy: actorId,
      }),
    ).rejects.toBeInstanceOf(IntegrationInvalidStateError);
  });

  it("returns not found for unknown integration", async () => {
    const integrationsRepository = new InMemoryIntegrationsRepository();
    await expect(
      integrationsRepository.update(tenantId, randomUUID(), {
        name: "Missing",
        updatedBy: actorId,
      }),
    ).rejects.toBeInstanceOf(IntegrationNotFoundError);
  });
});
