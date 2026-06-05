import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { UnexpectedPersistenceError } from "../domain/errors.js";
import type { PartnerPrincipal } from "../domain/types.js";
import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";
import { user_capabilities, users } from "../schema/tables.js";

const partnerColumns = {
  id: users.id,
  full_name: users.full_name,
  kind: users.kind,
  integration_id: users.integration_id,
  status: users.status,
  deactivated_at: users.deactivated_at,
  partner_deactivation_grant_ids: users.partner_deactivation_grant_ids,
} as const;

function rowToPartnerPrincipal(row: {
  id: string;
  full_name: string;
  kind: string;
  integration_id: string | null;
  status: string;
}): PartnerPrincipal {
  if (row.kind !== "partner") {
    throw new UnexpectedPersistenceError({
      cause: new Error(`Expected partner row, received kind=${row.kind}`),
    });
  }
  if (row.integration_id === null || row.integration_id.trim().length === 0) {
    throw new UnexpectedPersistenceError({
      cause: new Error("Partner principal row is missing integration_id"),
    });
  }
  return {
    id: row.id,
    full_name: row.full_name,
    kind: "partner",
    integration_id: row.integration_id,
    status: row.status as PartnerPrincipal["status"],
  };
}

type Tx = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

async function replaceSystemCapabilityGrantsInTx(
  tx: Tx,
  tenantId: string,
  input: {
    userId: string;
    capabilityIds: string[];
    actorId: string | null;
  },
): Promise<void> {
  const desiredIds = [...new Set(input.capabilityIds)];
  const current = await tx
    .select({
      id: user_capabilities.id,
      capability_id: user_capabilities.capability_id,
      grant_source: user_capabilities.grant_source,
      revoked_at: user_capabilities.revoked_at,
    })
    .from(user_capabilities)
    .where(
      and(
        eq(user_capabilities.iq_tenant_id, tenantId),
        eq(user_capabilities.user_id, input.userId),
      ),
    );

  const activeSystemIds = new Set(
    current
      .filter((row) => row.grant_source === "system" && row.revoked_at === null)
      .map((row) => row.capability_id),
  );

  const revokeIds = current
    .filter(
      (row) =>
        row.grant_source === "system" &&
        row.revoked_at === null &&
        !desiredIds.includes(row.capability_id),
    )
    .map((row) => row.id);

  if (revokeIds.length > 0) {
    await tx
      .update(user_capabilities)
      .set({
        revoked_at: new Date(),
        revoked_by_user_id: input.actorId,
      })
      .where(
        and(
          eq(user_capabilities.iq_tenant_id, tenantId),
          inArray(user_capabilities.id, revokeIds),
        ),
      );
  }

  const missingIds = desiredIds.filter((capabilityId) => !activeSystemIds.has(capabilityId));
  if (missingIds.length === 0) {
    return;
  }

  const grantedAt = new Date();
  await tx
    .insert(user_capabilities)
    .values(
      missingIds.map((capabilityId) => ({
        iq_tenant_id: tenantId,
        user_id: input.userId,
        capability_id: capabilityId,
        grant_source: "system" as const,
        source_role_id: null,
        granted_by_user_id: input.actorId,
        granted_at: grantedAt,
        revoked_at: null,
        revoked_by_user_id: null,
      })),
    )
    .onConflictDoUpdate({
      target: [
        user_capabilities.iq_tenant_id,
        user_capabilities.user_id,
        user_capabilities.capability_id,
      ],
      set: {
        grant_source: "system",
        source_role_id: null,
        granted_by_user_id: input.actorId,
        granted_at: grantedAt,
        revoked_at: null,
        revoked_by_user_id: null,
      },
    });
}

async function revokeActiveSystemGrantsAtInTx(
  tx: Tx,
  tenantId: string,
  userId: string,
  actorId: string | null,
  revokedAt: Date,
): Promise<string[]> {
  const activeRows = await tx
    .select({ id: user_capabilities.id })
    .from(user_capabilities)
    .where(
      and(
        eq(user_capabilities.iq_tenant_id, tenantId),
        eq(user_capabilities.user_id, userId),
        eq(user_capabilities.grant_source, "system"),
        isNull(user_capabilities.revoked_at),
      ),
    );

  const revokedIds = activeRows.map((row) => row.id);
  if (revokedIds.length === 0) {
    return revokedIds;
  }

  await tx
    .update(user_capabilities)
    .set({
      revoked_at: revokedAt,
      revoked_by_user_id: actorId,
    })
    .where(
      and(
        eq(user_capabilities.iq_tenant_id, tenantId),
        inArray(user_capabilities.id, revokedIds),
      ),
    );

  return revokedIds;
}

async function restoreSystemGrantsByIdsInTx(
  tx: Tx,
  tenantId: string,
  actorId: string | null,
  grantRowIds: string[],
): Promise<void> {
  if (grantRowIds.length === 0) {
    return;
  }

  await tx
    .update(user_capabilities)
    .set({
      revoked_at: null,
      revoked_by_user_id: null,
      granted_by_user_id: actorId,
      granted_at: new Date(),
    })
    .where(
      and(
        eq(user_capabilities.iq_tenant_id, tenantId),
        inArray(user_capabilities.id, grantRowIds),
      ),
    );
}

export class DrizzlePartnerPrincipalRepository implements PartnerPrincipalRepository {
  constructor(private readonly db: DbInstance) {}

  async findByIntegrationId(
    tenantId: string,
    integrationId: string,
  ): Promise<PartnerPrincipal | null> {
    const [row] = await this.db
      .select(partnerColumns)
      .from(users)
      .where(
        and(
          eq(users.iq_tenant_id, tenantId),
          eq(users.integration_id, integrationId),
          eq(users.kind, "partner"),
        ),
      )
      .limit(1);

    return row ? rowToPartnerPrincipal(row) : null;
  }

  async provisionPartnerPrincipal(
    tenantId: string,
    input: {
      integrationId: string;
      displayName: string;
      capabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<PartnerPrincipal> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select(partnerColumns)
        .from(users)
        .where(
          and(
            eq(users.iq_tenant_id, tenantId),
            eq(users.integration_id, input.integrationId),
            eq(users.kind, "partner"),
          ),
        )
        .limit(1);

      if (existing) {
        await replaceSystemCapabilityGrantsInTx(tx, tenantId, {
          userId: existing.id,
          capabilityIds: input.capabilityIds,
          actorId: input.actorId,
        });

        const [updated] = await tx
          .update(users)
          .set({
            full_name: input.displayName,
            status: "active",
            deactivated_at: null,
            partner_deactivation_grant_ids: null,
            updated_at: new Date(),
          })
          .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, existing.id)))
          .returning(partnerColumns);

        if (!updated) {
          throw new UnexpectedPersistenceError();
        }
        return rowToPartnerPrincipal(updated);
      }

      const [inserted] = await tx
        .insert(users)
        .values({
          iq_tenant_id: tenantId,
          full_name: input.displayName,
          kind: "partner",
          integration_id: input.integrationId,
          status: "active",
          deactivated_at: null,
          partner_deactivation_grant_ids: null,
          email: null,
          phone: null,
          username: null,
          auth_user_id: null,
        })
        .returning(partnerColumns);

      if (!inserted) {
        throw new UnexpectedPersistenceError();
      }

      await replaceSystemCapabilityGrantsInTx(tx, tenantId, {
        userId: inserted.id,
        capabilityIds: input.capabilityIds,
        actorId: input.actorId,
      });

      return rowToPartnerPrincipal(inserted);
    });
  }

  async deactivateByIntegrationId(
    tenantId: string,
    integrationId: string,
    actorId: string | null,
  ): Promise<PartnerPrincipal | null> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select(partnerColumns)
        .from(users)
        .where(
          and(
            eq(users.iq_tenant_id, tenantId),
            eq(users.integration_id, integrationId),
            eq(users.kind, "partner"),
          ),
        )
        .limit(1);

      if (!existing) {
        return null;
      }

      const deactivatedAt = new Date();
      const revokedGrantIds = await revokeActiveSystemGrantsAtInTx(
        tx,
        tenantId,
        existing.id,
        actorId,
        deactivatedAt,
      );

      const [updated] = await tx
        .update(users)
        .set({
          status: "inactive",
          deactivated_at: deactivatedAt,
          partner_deactivation_grant_ids: revokedGrantIds,
          updated_at: deactivatedAt,
        })
        .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, existing.id)))
        .returning(partnerColumns);

      if (!updated) {
        throw new UnexpectedPersistenceError();
      }
      return rowToPartnerPrincipal(updated);
    });
  }

  async reactivateByIntegrationId(
    tenantId: string,
    integrationId: string,
    actorId: string | null,
  ): Promise<PartnerPrincipal | null> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select(partnerColumns)
        .from(users)
        .where(
          and(
            eq(users.iq_tenant_id, tenantId),
            eq(users.integration_id, integrationId),
            eq(users.kind, "partner"),
          ),
        )
        .limit(1);

      if (!existing) {
        return null;
      }

      if (existing.deactivated_at === null) {
        if (existing.status === "active") {
          return rowToPartnerPrincipal(existing);
        }
        throw new UnexpectedPersistenceError({
          cause: new Error("Inactive partner principal is missing deactivated_at marker"),
        });
      }

      const grantIds = existing.partner_deactivation_grant_ids ?? [];
      await restoreSystemGrantsByIdsInTx(tx, tenantId, actorId, grantIds);

      const [updated] = await tx
        .update(users)
        .set({
          status: "active",
          deactivated_at: null,
          partner_deactivation_grant_ids: null,
          updated_at: new Date(),
        })
        .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, existing.id)))
        .returning(partnerColumns);

      if (!updated) {
        throw new UnexpectedPersistenceError();
      }
      return rowToPartnerPrincipal(updated);
    });
  }
}
