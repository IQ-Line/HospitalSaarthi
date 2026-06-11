import { and, desc, eq, type DbInstance } from "@hims/ts-sdk-db";
import type {
  VitalCheckInListQuery,
  VitalSignRepo,
  VitalSignRow,
} from "../domain/vital-sign.js";
import { vitalSigns } from "../schema/tables.js";

function fromDb(row: typeof vitalSigns.$inferSelect): VitalSignRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    episode_id: row.episode_id,
    check_in_id: row.check_in_id,
    recorded_at: row.recorded_at.toISOString(),
    vital_code: row.vital_code as VitalSignRow["vital_code"],
    vital_name: row.vital_name,
    data_type: row.data_type as VitalSignRow["data_type"],
    value_numeric: row.value_numeric,
    value_text: row.value_text,
    unit: row.unit,
    recorded_by: row.recorded_by,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/** In-memory store — default for Swagger (`IPD_USE_MOCK_DATA=true`). */
export class InMemoryVitalSignRepo implements VitalSignRepo {
  private store = new Map<string, VitalSignRow>();

  private k(tenantId: string, id: string) {
    return `${tenantId}:${id}`;
  }

  async listByEpisode(tenantId: string, episodeId: string, query?: VitalCheckInListQuery) {
    const rows = [...this.store.values()]
      .filter((r) => r.iq_tenant_id === tenantId && r.episode_id === episodeId)
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));

    if (!query?.recorder_role) return rows;

    const checkInIds = new Set<string>();
    for (const row of rows) {
      if (row.vital_code === "recorder_role" && row.value_text === query.recorder_role) {
        checkInIds.add(row.check_in_id);
      }
    }
    return rows.filter((r) => checkInIds.has(r.check_in_id));
  }

  async insertMany(rows: VitalSignRow[]) {
    for (const row of rows) {
      this.store.set(this.k(row.iq_tenant_id, row.id), row);
    }
    return rows;
  }
}

/** Postgres via Drizzle — set `IPD_USE_MOCK_DATA=false` + run `nx run ipd:db-migrate`. */
export class DrizzleVitalSignRepo implements VitalSignRepo {
  constructor(private db: DbInstance) {}

  async listByEpisode(tenantId: string, episodeId: string, query?: VitalCheckInListQuery) {
    const rows = await this.db
      .select()
      .from(vitalSigns)
      .where(and(eq(vitalSigns.iq_tenant_id, tenantId), eq(vitalSigns.episode_id, episodeId)))
      .orderBy(desc(vitalSigns.recorded_at));

    const mapped = rows.map(fromDb);
    if (!query?.recorder_role) return mapped;

    const checkInIds = new Set<string>();
    for (const row of mapped) {
      if (row.vital_code === "recorder_role" && row.value_text === query.recorder_role) {
        checkInIds.add(row.check_in_id);
      }
    }
    return mapped.filter((r) => checkInIds.has(r.check_in_id));
  }

  async insertMany(rows: VitalSignRow[]) {
    if (rows.length === 0) return [];
    const inserted = await this.db
      .insert(vitalSigns)
      .values(
        rows.map((row) => ({
          ...row,
          recorded_at: new Date(row.recorded_at),
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
        })),
      )
      .returning();
    return inserted.map(fromDb);
  }
}

export function createVitalSignRepo(db: DbInstance | undefined, useMock: boolean): VitalSignRepo {
  return useMock || !db ? new InMemoryVitalSignRepo() : new DrizzleVitalSignRepo(db);
}
