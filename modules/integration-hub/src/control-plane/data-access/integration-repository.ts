import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "drizzle-orm";
import type {
  CreateIntegrationInput,
  Integration,
  IntegrationConfig,
  IntegrationStatus,
  UpdateIntegrationInput,
} from "../domain/integration.types.js";
import { normalizeIntegrationConfig } from "../lib/integration-config.js";
import type { IntegrationRepository } from "../ports.js";
import { integrations } from "../schema/tables.js";

function rowToIntegration(row: {
  integration_id: string;
  integration_type: string;
  display_name: string;
  status: string;
  partner_principal_id: string | null;
  config: unknown;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}): Integration {
  const config =
    row.config !== null && typeof row.config === "object"
      ? (row.config as IntegrationConfig)
      : { allowedOperations: [] };

  return {
    integration_id: row.integration_id,
    integration_type: row.integration_type,
    display_name: row.display_name,
    status: row.status as IntegrationStatus,
    partner_principal_id: row.partner_principal_id,
    config,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    created_by: row.created_by,
    updated_by: row.updated_by,
  };
}

export class DrizzleIntegrationRepository implements IntegrationRepository {
  constructor(private readonly db: DbInstance) {}

  async create(
    tenantId: string,
    input: CreateIntegrationInput & { config: Integration["config"] },
    actorId: string,
  ): Promise<Integration> {
    const [row] = await this.db
      .insert(integrations)
      .values({
        iq_tenant_id: tenantId,
        integration_type: input.integration_type,
        display_name: input.display_name,
        status: "draft",
        config: input.config,
        created_by: actorId,
        updated_by: actorId,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to insert integration");
    }
    return rowToIntegration(row);
  }

  async update(
    tenantId: string,
    integrationId: string,
    input: UpdateIntegrationInput & { config?: Integration["config"] },
    actorId: string,
  ): Promise<Integration | null> {
    const patch: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: actorId,
    };
    if (input.display_name !== undefined) {
      patch.display_name = input.display_name;
    }
    if (input.config !== undefined) {
      patch.config = input.config;
    }

    const [row] = await this.db
      .update(integrations)
      .set(patch)
      .where(
        and(
          eq(integrations.iq_tenant_id, tenantId),
          eq(integrations.integration_id, integrationId),
        ),
      )
      .returning();

    return row ? rowToIntegration(row) : null;
  }

  async findById(tenantId: string, integrationId: string): Promise<Integration | null> {
    const [row] = await this.db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.iq_tenant_id, tenantId),
          eq(integrations.integration_id, integrationId),
        ),
      )
      .limit(1);
    return row ? rowToIntegration(row) : null;
  }

  async list(tenantId: string): Promise<Integration[]> {
    const rows = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.iq_tenant_id, tenantId));
    return rows.map(rowToIntegration);
  }

  async deleteDraft(tenantId: string, integrationId: string): Promise<boolean> {
    const result = await this.db
      .delete(integrations)
      .where(
        and(
          eq(integrations.iq_tenant_id, tenantId),
          eq(integrations.integration_id, integrationId),
          eq(integrations.status, "draft"),
        ),
      );
    return (result.rowCount ?? 0) > 0;
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
    const [row] = await this.db
      .update(integrations)
      .set({
        status: "active",
        partner_principal_id: input.partner_principal_id,
        config: input.config,
        updated_at: new Date(),
        updated_by: input.actorId,
      })
      .where(
        and(
          eq(integrations.iq_tenant_id, tenantId),
          eq(integrations.integration_id, integrationId),
          eq(integrations.status, "draft"),
        ),
      )
      .returning();
    return row ? rowToIntegration(row) : null;
  }

  async setStatus(
    tenantId: string,
    integrationId: string,
    status: Integration["status"],
    actorId: string,
  ): Promise<Integration | null> {
    const [row] = await this.db
      .update(integrations)
      .set({
        status,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(
        and(
          eq(integrations.iq_tenant_id, tenantId),
          eq(integrations.integration_id, integrationId),
        ),
      )
      .returning();
    return row ? rowToIntegration(row) : null;
  }
}

export function parseStoredIntegrationConfig(
  raw: unknown,
  defaults: { allowedOperations: string[]; suggestedCapabilityKeys?: string[] },
): IntegrationConfig {
  return normalizeIntegrationConfig(raw, defaults);
}
