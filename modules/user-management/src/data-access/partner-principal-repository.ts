import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "drizzle-orm";
import { UnexpectedPersistenceError } from "../domain/errors.js";
import { isPostgresUniqueViolation } from "./postgres-errors.js";
import type {
  PartnerPrincipalRepository,
  ProvisionPartnerPrincipalInput,
} from "../ports/partner-principal-repository.js";
import type { User } from "../ports/index.js";
import { capabilities, user_capabilities, users } from "../schema/tables.js";

const userColumns = {
  id: users.id,
  full_name: users.full_name,
  email: users.email,
  phone: users.phone,
  auth_user_id: users.auth_user_id,
  status: users.status,
  username: users.username,
  org_id: users.org_id,
  department: users.department,
  clearance_tier_required: users.clearance_tier_required,
} as const;

function rowToUser(row: {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  auth_user_id: string | null;
  status: string;
  username: string | null;
  org_id: string | null;
  department: string | null;
  clearance_tier_required: number;
}): User {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    auth_user_id: row.auth_user_id,
    username: row.username,
    org_id: row.org_id,
    department: row.department,
    clearance_tier_required: row.clearance_tier_required,
    status: row.status as User["status"],
  };
}

type Tx = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

async function grantCapabilitiesInTx(
  tx: Tx,
  tenantId: string,
  input: {
    userId: string;
    capabilityIds: string[];
    actorId: string | null;
  },
): Promise<void> {
  if (input.capabilityIds.length === 0) return;
  const grantedAt = new Date();
  await tx.insert(user_capabilities).values(
    input.capabilityIds.map((capabilityId) => ({
      iq_tenant_id: tenantId,
      user_id: input.userId,
      capability_id: capabilityId,
      grant_source: "manual" as const,
      source_role_id: null,
      granted_by_user_id: input.actorId,
      granted_at: grantedAt,
      revoked_at: null,
      revoked_by_user_id: null,
    })),
  );
}

export class DrizzlePartnerPrincipalRepository implements PartnerPrincipalRepository {
  constructor(private readonly db: DbInstance) {}

  async findByIntegrationId(tenantId: string, integrationId: string): Promise<User | null> {
    const [row] = await this.db
      .select(userColumns)
      .from(users)
      .where(
        and(
          eq(users.iq_tenant_id, tenantId),
          eq(users.kind, "partner"),
          eq(users.integration_id, integrationId),
        ),
      )
      .limit(1);
    return row ? rowToUser(row) : null;
  }

  async provisionPartnerPrincipal(
    tenantId: string,
    input: ProvisionPartnerPrincipalInput,
  ): Promise<User> {
    try {
      return await this.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(users)
          .values({
            iq_tenant_id: tenantId,
            kind: "partner",
            integration_id: input.integrationId,
            full_name: input.integrationDisplayName.trim(),
            email: null,
            phone: null,
            username: null,
            auth_user_id: null,
            status: "active",
            clearance_tier_required: 0,
          })
          .returning(userColumns);

        if (!inserted) {
          throw new UnexpectedPersistenceError();
        }

        await grantCapabilitiesInTx(tx, tenantId, {
          userId: inserted.id,
          capabilityIds: input.capabilityIds,
          actorId: input.actorId,
        });

        return rowToUser(inserted);
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw error;
      }
      throw error;
    }
  }

  async reactivatePartnerPrincipal(
    tenantId: string,
    integrationId: string,
  ): Promise<User | null> {
    const [updated] = await this.db
      .update(users)
      .set({ status: "active", updated_at: new Date() })
      .where(
        and(
          eq(users.iq_tenant_id, tenantId),
          eq(users.kind, "partner"),
          eq(users.integration_id, integrationId),
        ),
      )
      .returning(userColumns);
    return updated ? rowToUser(updated) : null;
  }
}
