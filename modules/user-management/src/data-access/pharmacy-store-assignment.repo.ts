import { randomUUID } from "node:crypto";
import { and, eq, type DbInstance } from "@hims/ts-sdk-db";
import type {
  PharmacyStoreAccessSnapshot,
  PharmacyStoreAssignmentRow,
} from "../domain/pharmacy-store-access.types.js";
import { pharmacy_store_assignments } from "../schema/tables.js";

function mapRows(rows: (typeof pharmacy_store_assignments.$inferSelect)[]): PharmacyStoreAccessSnapshot {
  const primary = rows.find((row) => row.assignment_kind === "primary");
  const secondary = rows
    .filter((row) => row.assignment_kind === "secondary")
    .map((row) => row.store_id);
  return {
    primary_store_id: primary?.store_id ?? null,
    secondary_store_ids: secondary,
  };
}

export class DrizzlePharmacyStoreAssignmentRepository {
  constructor(private readonly db: DbInstance) {}

  async getForUser(tenantId: string, userId: string): Promise<PharmacyStoreAccessSnapshot> {
    const rows = await this.db
      .select()
      .from(pharmacy_store_assignments)
      .where(
        and(
          eq(pharmacy_store_assignments.iq_tenant_id, tenantId),
          eq(pharmacy_store_assignments.user_id, userId),
        ),
      );
    return mapRows(rows);
  }

  async replaceForUser(
    tenantId: string,
    userId: string,
    assignments: PharmacyStoreAssignmentRow[],
  ): Promise<PharmacyStoreAccessSnapshot> {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(pharmacy_store_assignments)
        .where(
          and(
            eq(pharmacy_store_assignments.iq_tenant_id, tenantId),
            eq(pharmacy_store_assignments.user_id, userId),
          ),
        );

      if (assignments.length === 0) {
        return { primary_store_id: null, secondary_store_ids: [] };
      }

      const now = new Date();
      await tx.insert(pharmacy_store_assignments).values(
        assignments.map((assignment) => ({
          id: randomUUID(),
          iq_tenant_id: tenantId,
          user_id: userId,
          store_id: assignment.store_id,
          assignment_kind: assignment.assignment_kind,
          created_at: now,
          updated_at: now,
        })),
      );

      const rows = await tx
        .select()
        .from(pharmacy_store_assignments)
        .where(
          and(
            eq(pharmacy_store_assignments.iq_tenant_id, tenantId),
            eq(pharmacy_store_assignments.user_id, userId),
          ),
        );
      return mapRows(rows);
    });
  }

  async clearForUser(tenantId: string, userId: string): Promise<void> {
    await this.db
      .delete(pharmacy_store_assignments)
      .where(
        and(
          eq(pharmacy_store_assignments.iq_tenant_id, tenantId),
          eq(pharmacy_store_assignments.user_id, userId),
        ),
      );
  }
}

export function createPharmacyStoreAssignmentRepository(
  db: DbInstance,
): DrizzlePharmacyStoreAssignmentRepository {
  return new DrizzlePharmacyStoreAssignmentRepository(db);
}
