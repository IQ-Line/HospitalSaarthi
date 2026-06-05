import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, sql } from "drizzle-orm";
import {
  IntegrationConflictError,
  IntegrationInvalidStateError,
  IntegrationNotFoundError,
} from "../domain/integration-errors.js";
import type {
  CreateIntegrationInput,
  Integration,
  IntegrationConfig,
  UpdateIntegrationInput,
} from "../domain/integration.types.js";
import { isPostgresUniqueViolation } from "./postgres-errors.js";
import type { IntegrationsRepository } from "../ports.js";
import { integrationApiKeys, integrations } from "../schema/tables.js";

function normalizeConfig(raw: unknown): IntegrationConfig {
  if (raw == null || typeof raw !== "object") {
    return { allowedOperations: [], capabilityKeys: [] };
  }
  const obj = raw as Record<string, unknown>;
  const allowedOperations = Array.isArray(obj.allowedOperations)
    ? obj.allowedOperations.filter((v): v is string => typeof v === "string")
    : [];
  const capabilityKeys = Array.isArray(obj.capabilityKeys)
    ? obj.capabilityKeys.filter((v): v is string => typeof v === "string")
    : [];
  return { allowedOperations, capabilityKeys };
}

function rowToIntegration(row: typeof integrations.$inferSelect): Integration {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    name: row.name,
    integration_type: row.integration_type,
    direction: row.direction as Integration["direction"],
    status: row.status as Integration["status"],
    partner_principal_id: row.partner_principal_id,
    config: normalizeConfig(row.config),
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export class DrizzleIntegrationsRepository implements IntegrationsRepository {
  constructor(private readonly db: DbInstance) {}

  async create(
    tenantId: string,
    input: CreateIntegrationInput & {
      direction: string;
      config: Integration["config"];
      createdBy: string | null;
    },
  ): Promise<Integration> {
    try {
      const [row] = await this.db
        .insert(integrations)
        .values({
          iq_tenant_id: tenantId,
          name: input.name.trim(),
          integration_type: input.integration_type.trim().toLowerCase(),
          direction: input.direction,
          status: "draft",
          config: input.config,
          created_by: input.createdBy,
          updated_by: input.createdBy,
        })
        .returning();
      if (!row) throw new Error("integration insert failed");
      return rowToIntegration(row);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new IntegrationConflictError();
      }
      throw error;
    }
  }

  async getById(tenantId: string, integrationId: string): Promise<Integration | null> {
    const [row] = await this.db
      .select()
      .from(integrations)
      .where(and(eq(integrations.iq_tenant_id, tenantId), eq(integrations.id, integrationId)))
      .limit(1);
    return row ? rowToIntegration(row) : null;
  }

  async list(tenantId: string): Promise<Integration[]> {
    const rows = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.iq_tenant_id, tenantId))
      .orderBy(sql`${integrations.created_at} desc`);
    return rows.map(rowToIntegration);
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

    const nextConfig =
      patch.config !== undefined
        ? {
            allowedOperations:
              patch.config.allowedOperations ?? existing.config.allowedOperations,
            capabilityKeys: patch.config.capabilityKeys ?? existing.config.capabilityKeys,
          }
        : existing.config;

    try {
      const [row] = await this.db
        .update(integrations)
        .set({
          ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
          config: nextConfig,
          updated_by: patch.updatedBy,
          updated_at: new Date(),
        })
        .where(and(eq(integrations.iq_tenant_id, tenantId), eq(integrations.id, integrationId)))
        .returning();
      return row ? rowToIntegration(row) : null;
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new IntegrationConflictError();
      }
      throw error;
    }
  }

  async deleteDraft(tenantId: string, integrationId: string): Promise<boolean> {
    const result = await this.db
      .delete(integrations)
      .where(
        and(
          eq(integrations.iq_tenant_id, tenantId),
          eq(integrations.id, integrationId),
          eq(integrations.status, "draft"),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  }

  async activate(
    tenantId: string,
    integrationId: string,
    partnerPrincipalId: string,
    updatedBy: string | null,
  ): Promise<Integration | null> {
    const [row] = await this.db
      .update(integrations)
      .set({
        status: "active",
        partner_principal_id: partnerPrincipalId,
        updated_by: updatedBy,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(integrations.iq_tenant_id, tenantId),
          eq(integrations.id, integrationId),
          eq(integrations.status, "draft"),
        ),
      )
      .returning();
    return row ? rowToIntegration(row) : null;
  }

  async disable(
    tenantId: string,
    integrationId: string,
    updatedBy: string | null,
  ): Promise<Integration | null> {
    const [row] = await this.db
      .update(integrations)
      .set({
        status: "disabled",
        updated_by: updatedBy,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(integrations.iq_tenant_id, tenantId),
          eq(integrations.id, integrationId),
          eq(integrations.status, "active"),
        ),
      )
      .returning();
    return row ? rowToIntegration(row) : null;
  }

  async disableWithKeyRevocation(
    tenantId: string,
    integrationId: string,
    updatedBy: string | null,
  ): Promise<Integration | null> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(integrations)
        .set({
          status: "disabled",
          updated_by: updatedBy,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(integrations.iq_tenant_id, tenantId),
            eq(integrations.id, integrationId),
            eq(integrations.status, "active"),
          ),
        )
        .returning();
      if (!row) return null;

      await tx
        .update(integrationApiKeys)
        .set({
          status: "revoked",
          revoked_by: updatedBy,
          revoked_at: new Date(),
        })
        .where(
          and(
            eq(integrationApiKeys.iq_tenant_id, tenantId),
            eq(integrationApiKeys.integration_id, integrationId),
            eq(integrationApiKeys.status, "active"),
          ),
        );

      return rowToIntegration(row);
    });
  }

  async reactivate(
    tenantId: string,
    integrationId: string,
    updatedBy: string | null,
  ): Promise<Integration | null> {
    const [row] = await this.db
      .update(integrations)
      .set({
        status: "active",
        updated_by: updatedBy,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(integrations.iq_tenant_id, tenantId),
          eq(integrations.id, integrationId),
          eq(integrations.status, "disabled"),
        ),
      )
      .returning();
    return row ? rowToIntegration(row) : null;
  }
}
