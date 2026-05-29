import {
  and,
  eq,
  ilike,
  isNull,
  or,
  type DbInstance,
  type SQL,
} from "@hims/ts-sdk-db";
import type { SequenceConfigurationRepo } from "../ports.js";
import type { ProvisioningStatus } from "../domain/tenant.types.js";
import type {
  IdentifierOverrides,
  IdentifierType,
  SequenceConfigStatus,
  SequenceConfiguration,
  SequenceConfigurationFilters,
  SequenceConfigurationSummary,
} from "../domain/sequence-configuration.js";
import {
  buildIdentifierSummaries,
  countCustomIdentifiers,
  deriveConfigurationStatus,
} from "../domain/sequence-configuration.js";
import { sequenceConfiguration, tenants } from "../schema/tables.js";

function mapRow(row: typeof sequenceConfiguration.$inferSelect): SequenceConfiguration {
  return {
    ...row,
    status: row.status as SequenceConfigStatus,
    identifier_overrides: (row.identifier_overrides ?? {}) as IdentifierOverrides,
  };
}

export class DrizzleSequenceConfigurationRepo implements SequenceConfigurationRepo {
  constructor(private readonly db: DbInstance) {}

  async findByTenantId(tenantId: string): Promise<SequenceConfiguration | undefined> {
    const rows = await this.db
      .select()
      .from(sequenceConfiguration)
      .where(eq(sequenceConfiguration.iq_tenant_id, tenantId))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async listSummaries(
    filters?: SequenceConfigurationFilters,
  ): Promise<SequenceConfigurationSummary[]> {
    const conditions: SQL[] = [];

    if (filters?.org_id) {
      conditions.push(eq(tenants.org_id, filters.org_id));
    }
    if (filters?.provisioning_status) {
      conditions.push(eq(tenants.provisioning_status, filters.provisioning_status));
    }
    if (filters?.q?.trim()) {
      const term = `%${filters.q.trim()}%`;
      conditions.push(
        or(ilike(tenants.name, term), ilike(tenants.tenant_numeric_code, term))!,
      );
    }
    if (filters?.status === "configured") {
      conditions.push(eq(sequenceConfiguration.status, "configured"));
    }
    if (filters?.status === "default") {
      conditions.push(
        or(
          isNull(sequenceConfiguration.iq_tenant_id),
          eq(sequenceConfiguration.status, "default"),
        )!,
      );
    }

    const query = this.db
      .select({
        iq_tenant_id: tenants.iq_tenant_id,
        tenant_name: tenants.name,
        tenant_numeric_code: tenants.tenant_numeric_code,
        provisioning_status: tenants.provisioning_status,
        status: sequenceConfiguration.status,
        configured_at: sequenceConfiguration.configured_at,
        identifier_overrides: sequenceConfiguration.identifier_overrides,
      })
      .from(tenants)
      .leftJoin(
        sequenceConfiguration,
        eq(tenants.iq_tenant_id, sequenceConfiguration.iq_tenant_id),
      );

    const rows =
      conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    return rows.map((row) => {
      const overrides = (row.identifier_overrides ?? {}) as IdentifierOverrides;
      const customCount = countCustomIdentifiers(overrides);
      return {
        iq_tenant_id: row.iq_tenant_id,
        tenant_name: row.tenant_name,
        tenant_numeric_code: row.tenant_numeric_code,
        provisioning_status: row.provisioning_status as ProvisioningStatus,
        status: (row.status ?? "default") as SequenceConfigStatus,
        custom_count: customCount,
        identifiers: buildIdentifierSummaries(overrides),
      };
    });
  }

  async upsertIdentifier(
    tenantId: string,
    identifierType: IdentifierType,
    override: IdentifierOverrides[IdentifierType],
    actorId: string | null,
  ): Promise<SequenceConfiguration> {
    const existing = await this.findByTenantId(tenantId);
    const nextOverrides: IdentifierOverrides = {
      ...(existing?.identifier_overrides ?? {}),
      [identifierType]: override,
    };
    const status = deriveConfigurationStatus(nextOverrides);
    const configuredAt =
      status === "configured" ? (existing?.configured_at ?? new Date()) : null;

    if (existing) {
      const rows = await this.db
        .update(sequenceConfiguration)
        .set({
          identifier_overrides: nextOverrides,
          status,
          configured_at: configuredAt,
          updated_at: new Date(),
          updated_by: actorId,
        })
        .where(eq(sequenceConfiguration.iq_tenant_id, tenantId))
        .returning();
      return mapRow(rows[0]!);
    }

    const rows = await this.db
      .insert(sequenceConfiguration)
      .values({
        iq_tenant_id: tenantId,
        identifier_overrides: nextOverrides,
        status,
        configured_at: configuredAt,
        created_by: actorId,
        updated_by: actorId,
      })
      .returning();
    return mapRow(rows[0]!);
  }

  async removeIdentifier(
    tenantId: string,
    identifierType: IdentifierType,
    actorId: string | null,
  ): Promise<void> {
    const existing = await this.findByTenantId(tenantId);
    if (!existing) return;

    const nextOverrides = { ...existing.identifier_overrides };
    delete nextOverrides[identifierType];

    if (Object.keys(nextOverrides).length === 0) {
      await this.db
        .update(sequenceConfiguration)
        .set({
          identifier_overrides: {},
          status: "default",
          configured_at: null,
          updated_at: new Date(),
          updated_by: actorId,
        })
        .where(eq(sequenceConfiguration.iq_tenant_id, tenantId));
      return;
    }

    const status = deriveConfigurationStatus(nextOverrides);
    await this.db
      .update(sequenceConfiguration)
      .set({
        identifier_overrides: nextOverrides,
        status,
        configured_at: status === "configured" ? existing.configured_at : null,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(sequenceConfiguration.iq_tenant_id, tenantId));
  }
}
