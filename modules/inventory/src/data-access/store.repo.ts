import { and, eq, ilike, or, sql, type DbInstance, type SQL } from "@hims/ts-sdk-db";
import { desc } from "drizzle-orm";
import type { ListStoresQuery, StoreRow, UpdateStoreInput } from "../domain/store.types.js";
import { StoreConflictError } from "../errors.js";
import type { StoreRepo } from "../ports.js";
import { inventoryStoreCodeSequences, inventoryStores } from "../schema/tables.js";

/** Branches are not modeled yet — satisfy NOT NULL `branch_id` with a stable sentinel. */
export const INVENTORY_NO_BRANCH_ID = "00000000-0000-0000-0000-000000000001";

function mapRow(row: typeof inventoryStores.$inferSelect): StoreRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    store_code: row.store_code,
    store_name: row.store_name,
    store_type_id: row.store_type_id,
    facility_id: row.facility_id,
    department_id: row.department_id,
    physical_location: row.physical_location,
    can_receive_stock: row.can_receive_stock,
    can_dispense: row.can_dispense,
    can_issue_to_ward: row.can_issue_to_ward,
    track_batch_expiry: row.track_batch_expiry,
    indent_authority: row.indent_authority,
    indent_target_store_id: row.indent_target_store_id,
    is_central_store: row.is_central_store,
    is_active: row.is_active,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isPgUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error != null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

function formatStoreCode(storeTypeCode: string, sequence: number): string {
  const prefix = storeTypeCode.trim().toUpperCase().replace(/\s+/g, "-");
  return `${prefix}-${String(sequence).padStart(5, "0")}`;
}

function buildStorePatch(
  input: UpdateStoreInput,
  actorId: string | null,
): Partial<typeof inventoryStores.$inferInsert> {
  const patch: Partial<typeof inventoryStores.$inferInsert> = {
    updated_by: actorId,
    updated_at: new Date(),
  };

  if (input.store_name !== undefined) patch.store_name = input.store_name.trim();
  if (input.store_type_id !== undefined) patch.store_type_id = input.store_type_id;
  if (input.facility_id !== undefined) patch.facility_id = input.facility_id;
  if (input.department_id !== undefined) patch.department_id = input.department_id;
  if (input.physical_location !== undefined) {
    patch.physical_location = input.physical_location.trim();
  }
  if (input.can_receive_stock !== undefined) patch.can_receive_stock = input.can_receive_stock;
  if (input.can_dispense !== undefined) patch.can_dispense = input.can_dispense;
  if (input.can_issue_to_ward !== undefined) patch.can_issue_to_ward = input.can_issue_to_ward;
  if (input.track_batch_expiry !== undefined) patch.track_batch_expiry = input.track_batch_expiry;
  if (input.indent_authority !== undefined) patch.indent_authority = input.indent_authority;
  if (input.indent_target_store_id !== undefined) {
    patch.indent_target_store_id = input.indent_target_store_id;
  }
  if (input.is_central_store !== undefined) patch.is_central_store = input.is_central_store;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  return patch;
}

function listConditions(tenantId: string, query: ListStoresQuery): SQL[] {
  const conditions: SQL[] = [eq(inventoryStores.iq_tenant_id, tenantId)];
  if (query.is_active !== undefined) {
    conditions.push(eq(inventoryStores.is_active, query.is_active));
  }
  const search = query.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(inventoryStores.store_name, pattern),
        ilike(inventoryStores.store_code, pattern),
      )!,
    );
  }
  return conditions;
}

export function createStoreRepo(db: DbInstance): StoreRepo {
  return {
    async list(tenantId, query) {
      const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
      const offset = Math.max(query.offset ?? 0, 0);
      const where = and(...listConditions(tenantId, query));

      const [countRow] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(inventoryStores)
        .where(where);

      const rows = await db
        .select()
        .from(inventoryStores)
        .where(where)
        .orderBy(desc(inventoryStores.created_at), desc(inventoryStores.id))
        .limit(limit)
        .offset(offset);

      return { rows: rows.map(mapRow), total: countRow?.total ?? 0 };
    },

    async findById(tenantId, storeId) {
      const [row] = await db
        .select()
        .from(inventoryStores)
        .where(
          and(eq(inventoryStores.iq_tenant_id, tenantId), eq(inventoryStores.id, storeId)),
        )
        .limit(1);
      return row ? mapRow(row) : undefined;
    },

    async findCentralStore(tenantId) {
      const [row] = await db
        .select()
        .from(inventoryStores)
        .where(
          and(
            eq(inventoryStores.iq_tenant_id, tenantId),
            eq(inventoryStores.is_central_store, true),
          ),
        )
        .limit(1);
      return row ? mapRow(row) : undefined;
    },

    async create(tenantId, storeTypeCode, input, actorId) {
      try {
        return await db.transaction(async (tx) => {
          const [seqRow] = await tx
            .insert(inventoryStoreCodeSequences)
            .values({
              iq_tenant_id: tenantId,
              store_type_id: input.store_type_id,
              last_sequence: 1,
            })
            .onConflictDoUpdate({
              target: [
                inventoryStoreCodeSequences.iq_tenant_id,
                inventoryStoreCodeSequences.store_type_id,
              ],
              set: {
                last_sequence: sql`${inventoryStoreCodeSequences.last_sequence} + 1`,
              },
            })
            .returning({ last_sequence: inventoryStoreCodeSequences.last_sequence });

          const sequence = seqRow?.last_sequence ?? 1;
          const store_code = formatStoreCode(storeTypeCode, sequence);

          const [row] = await tx
            .insert(inventoryStores)
            .values({
              iq_tenant_id: tenantId,
              store_code,
              store_name: input.store_name.trim(),
              store_type_id: input.store_type_id,
              facility_id: input.facility_id,
              branch_id: INVENTORY_NO_BRANCH_ID,
              department_id: input.department_id,
              physical_location: input.physical_location?.trim() ?? "",
              can_receive_stock: input.can_receive_stock ?? false,
              can_dispense: input.can_dispense ?? false,
              can_issue_to_ward: input.can_issue_to_ward ?? false,
              track_batch_expiry: input.track_batch_expiry ?? true,
              indent_authority: input.indent_authority ?? false,
              indent_target_store_id: input.indent_target_store_id ?? null,
              is_central_store: input.is_central_store ?? false,
              is_active: input.is_active ?? true,
              created_by: actorId,
              updated_by: actorId,
            })
            .returning();

          if (!row) {
            throw new Error("Store insert returned no row");
          }
          return mapRow(row);
        });
      } catch (error) {
        if (isPgUniqueViolation(error)) {
          throw new StoreConflictError("A store with this code already exists.");
        }
        throw error;
      }
    },

    async update(tenantId, storeId, input, actorId) {
      const patch = buildStorePatch(input, actorId);

      try {
        const [row] = await db
          .update(inventoryStores)
          .set(patch)
          .where(
            and(eq(inventoryStores.iq_tenant_id, tenantId), eq(inventoryStores.id, storeId)),
          )
          .returning();
        return row ? mapRow(row) : undefined;
      } catch (error) {
        if (isPgUniqueViolation(error)) {
          throw new StoreConflictError("A store with this code already exists.");
        }
        throw error;
      }
    },
  };
}
