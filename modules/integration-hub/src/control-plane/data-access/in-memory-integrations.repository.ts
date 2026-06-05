import { randomUUID } from "node:crypto";
import {
  IntegrationConflictError,
  IntegrationInvalidStateError,
  IntegrationNotFoundError,
} from "../domain/integration-errors.js";
import type {
  CreateIntegrationInput,
  Integration,
  UpdateIntegrationInput,
} from "../domain/integration.types.js";
import type { IntegrationApiKeysRepository, IntegrationsRepository } from "../ports.js";

export class InMemoryIntegrationsRepository implements IntegrationsRepository {
  private readonly rows = new Map<string, Integration>();

  constructor(private readonly apiKeysRepository?: IntegrationApiKeysRepository) {}

  private key(tenantId: string, integrationId: string): string {
    return `${tenantId}:${integrationId}`;
  }

  async create(
    tenantId: string,
    input: CreateIntegrationInput & {
      direction: string;
      config: Integration["config"];
      createdBy: string | null;
    },
  ): Promise<Integration> {
    const normalizedName = input.name.trim().toLowerCase();
    for (const row of this.rows.values()) {
      if (row.iq_tenant_id === tenantId && row.name.trim().toLowerCase() === normalizedName) {
        throw new IntegrationConflictError();
      }
    }

    const now = new Date().toISOString();
    const integration: Integration = {
      id: randomUUID(),
      iq_tenant_id: tenantId,
      name: input.name.trim(),
      integration_type: input.integration_type,
      direction: input.direction as Integration["direction"],
      status: "draft",
      partner_principal_id: null,
      config: input.config,
      created_by: input.createdBy,
      updated_by: input.createdBy,
      created_at: now,
      updated_at: now,
    };
    this.rows.set(this.key(tenantId, integration.id), integration);
    return integration;
  }

  async getById(tenantId: string, integrationId: string): Promise<Integration | null> {
    return this.rows.get(this.key(tenantId, integrationId)) ?? null;
  }

  async list(tenantId: string): Promise<Integration[]> {
    return [...this.rows.values()].filter((row) => row.iq_tenant_id === tenantId);
  }

  async update(
    tenantId: string,
    integrationId: string,
    patch: UpdateIntegrationInput & { updatedBy: string | null },
  ): Promise<Integration | null> {
    const existing = await this.getById(tenantId, integrationId);
    if (!existing) {
      throw new IntegrationNotFoundError();
    }
    if (existing.status !== "draft") {
      throw new IntegrationInvalidStateError("Only draft integrations can be updated.");
    }

    const updated: Integration = {
      ...existing,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      config:
        patch.config !== undefined
          ? {
              allowedOperations: patch.config.allowedOperations ?? existing.config.allowedOperations,
              capabilityKeys: patch.config.capabilityKeys ?? existing.config.capabilityKeys,
            }
          : existing.config,
      updated_by: patch.updatedBy,
      updated_at: new Date().toISOString(),
    };
    this.rows.set(this.key(tenantId, integrationId), updated);
    return updated;
  }

  async deleteDraft(tenantId: string, integrationId: string): Promise<boolean> {
    const existing = await this.getById(tenantId, integrationId);
    if (!existing || existing.status !== "draft") return false;
    return this.rows.delete(this.key(tenantId, integrationId));
  }

  async activate(
    tenantId: string,
    integrationId: string,
    partnerPrincipalId: string,
    updatedBy: string | null,
  ): Promise<Integration | null> {
    const existing = await this.getById(tenantId, integrationId);
    if (!existing || existing.status !== "draft") return null;
    const activated: Integration = {
      ...existing,
      status: "active",
      partner_principal_id: partnerPrincipalId,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    };
    this.rows.set(this.key(tenantId, integrationId), activated);
    return activated;
  }

  async disable(
    tenantId: string,
    integrationId: string,
    updatedBy: string | null,
  ): Promise<Integration | null> {
    return this.disableWithKeyRevocation(tenantId, integrationId, updatedBy);
  }

  async disableWithKeyRevocation(
    tenantId: string,
    integrationId: string,
    updatedBy: string | null,
  ): Promise<Integration | null> {
    const existing = await this.getById(tenantId, integrationId);
    if (!existing || existing.status !== "active") return null;
    const disabled: Integration = {
      ...existing,
      status: "disabled",
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    };
    this.rows.set(this.key(tenantId, integrationId), disabled);
    if (this.apiKeysRepository) {
      await this.apiKeysRepository.revokeAllActiveForIntegration(
        tenantId,
        integrationId,
        updatedBy,
      );
    }
    return disabled;
  }

  async reactivate(
    tenantId: string,
    integrationId: string,
    updatedBy: string | null,
  ): Promise<Integration | null> {
    const existing = await this.getById(tenantId, integrationId);
    if (!existing || existing.status !== "disabled") return null;
    const reactivated: Integration = {
      ...existing,
      status: "active",
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    };
    this.rows.set(this.key(tenantId, integrationId), reactivated);
    return reactivated;
  }
}
