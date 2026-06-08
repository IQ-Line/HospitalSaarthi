import { randomUUID } from "node:crypto";
import type {
  CreateIntegrationInput,
  Integration,
  UpdateIntegrationInput,
} from "../domain/integration.types.js";
import type { IntegrationRepository } from "../ports.js";

export class InMemoryIntegrationRepository implements IntegrationRepository {
  private readonly rows = new Map<string, Integration>();

  private key(tenantId: string, integrationId: string): string {
    return `${tenantId}:${integrationId}`;
  }

  async create(
    tenantId: string,
    input: CreateIntegrationInput & { config: Integration["config"] },
    actorId: string,
  ): Promise<Integration> {
    const now = new Date().toISOString();
    const integration: Integration = {
      integration_id: randomUUID(),
      integration_type: input.integration_type,
      display_name: input.display_name,
      status: "draft",
      partner_principal_id: null,
      config: input.config,
      created_at: now,
      updated_at: now,
      created_by: actorId,
      updated_by: actorId,
    };
    this.rows.set(this.key(tenantId, integration.integration_id), integration);
    return integration;
  }

  async update(
    tenantId: string,
    integrationId: string,
    input: UpdateIntegrationInput & { config?: Integration["config"] },
    actorId: string,
  ): Promise<Integration | null> {
    const existing = await this.findById(tenantId, integrationId);
    if (existing === null) return null;
    const updated: Integration = {
      ...existing,
      display_name: input.display_name ?? existing.display_name,
      config: input.config ?? existing.config,
      updated_at: new Date().toISOString(),
      updated_by: actorId,
    };
    this.rows.set(this.key(tenantId, integrationId), updated);
    return updated;
  }

  async findById(tenantId: string, integrationId: string): Promise<Integration | null> {
    return this.rows.get(this.key(tenantId, integrationId)) ?? null;
  }

  async list(tenantId: string): Promise<Integration[]> {
    const prefix = `${tenantId}:`;
    return [...this.rows.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, row]) => row);
  }

  async deleteDraft(tenantId: string, integrationId: string): Promise<boolean> {
    const existing = await this.findById(tenantId, integrationId);
    if (existing === null || existing.status !== "draft") return false;
    return this.rows.delete(this.key(tenantId, integrationId));
  }

  async activate(
    tenantId: string,
    integrationId: string,
    input: {
      partner_principal_id: string;
      config: Integration["config"];
      actorId: string;
    },
  ): Promise<Integration | null> {
    const existing = await this.findById(tenantId, integrationId);
    if (existing === null || existing.status !== "draft") return null;
    const updated: Integration = {
      ...existing,
      status: "active",
      partner_principal_id: input.partner_principal_id,
      config: input.config,
      updated_at: new Date().toISOString(),
      updated_by: input.actorId,
    };
    this.rows.set(this.key(tenantId, integrationId), updated);
    return updated;
  }

  async setStatus(
    tenantId: string,
    integrationId: string,
    status: Integration["status"],
    actorId: string,
  ): Promise<Integration | null> {
    const existing = await this.findById(tenantId, integrationId);
    if (existing === null) return null;
    const updated: Integration = {
      ...existing,
      status,
      updated_at: new Date().toISOString(),
      updated_by: actorId,
    };
    this.rows.set(this.key(tenantId, integrationId), updated);
    return updated;
  }
}
