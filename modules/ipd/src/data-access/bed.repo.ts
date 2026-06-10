import { and, eq, type DbInstance } from "@hims/ts-sdk-db";
import { beds } from "../schema/tables.js";
import type { Bed, BedStatus } from "../domain/bed.js";
import type { BedRepo } from "../ports.js";

const PLACEHOLDER_WARD_ID = "00000000-0000-0000-0000-000000000099";

function fromDb(row: typeof beds.$inferSelect): Bed {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    ward_id: row.ward_id,
    bed_code: row.bed_code,
    bed_status: row.bed_status as BedStatus,
    current_patient_id: row.current_patient_id,
    current_episode_id: row.current_episode_id,
    reserved_for_episode_id: row.reserved_for_episode_id,
  };
}

function canReserve(bed: Bed, episodeId: string): boolean {
  if (bed.bed_status === "available") return true;
  if (bed.bed_status === "reserved" && bed.reserved_for_episode_id === episodeId) return true;
  return false;
}

function canOccupy(bed: Bed, episodeId: string): boolean {
  if (bed.bed_status === "available") return true;
  if (bed.bed_status === "reserved" && bed.reserved_for_episode_id === episodeId) return true;
  if (bed.bed_status === "occupied" && bed.current_episode_id === episodeId) return true;
  return false;
}

export class InMemoryBedRepo implements BedRepo {
  private store = new Map<string, Bed>();

  private k(tenantId: string, bedId: string) {
    return `${tenantId}:${bedId}`;
  }

  async getById(tenantId: string, bedId: string) {
    return this.store.get(this.k(tenantId, bedId)) ?? null;
  }

  private ensureBed(tenantId: string, bedId: string): Bed {
    const key = this.k(tenantId, bedId);
    const existing = this.store.get(key);
    if (existing) return existing;
    const created: Bed = {
      id: bedId,
      iq_tenant_id: tenantId,
      ward_id: PLACEHOLDER_WARD_ID,
      bed_code: bedId,
      bed_status: "available",
      current_patient_id: null,
      current_episode_id: null,
      reserved_for_episode_id: null,
    };
    this.store.set(key, created);
    return created;
  }

  async reserveForEpisode(tenantId: string, bedId: string, episodeId: string) {
    const bed = this.ensureBed(tenantId, bedId);
    if (!canReserve(bed, episodeId)) return null;
    const next: Bed = {
      ...bed,
      bed_status: "reserved",
      reserved_for_episode_id: episodeId,
    };
    this.store.set(this.k(tenantId, bedId), next);
    return next;
  }

  async occupyForEpisode(
    tenantId: string,
    bedId: string,
    episodeId: string,
    patientId: string,
  ) {
    const bed = this.ensureBed(tenantId, bedId);
    if (!canOccupy(bed, episodeId)) return null;
    const next: Bed = {
      ...bed,
      bed_status: "occupied",
      current_patient_id: patientId,
      current_episode_id: episodeId,
      reserved_for_episode_id: null,
    };
    this.store.set(this.k(tenantId, bedId), next);
    return next;
  }

  async releaseReservation(tenantId: string, bedId: string, episodeId: string) {
    const bed = await this.getById(tenantId, bedId);
    if (!bed) return;
    if (bed.bed_status !== "reserved" || bed.reserved_for_episode_id !== episodeId) return;
    this.store.set(this.k(tenantId, bedId), {
      ...bed,
      bed_status: "available",
      reserved_for_episode_id: null,
    });
  }
}

export class DrizzleBedRepo implements BedRepo {
  constructor(private db: DbInstance) {}

  async getById(tenantId: string, bedId: string) {
    const [row] = await this.db
      .select()
      .from(beds)
      .where(and(eq(beds.iq_tenant_id, tenantId), eq(beds.id, bedId)))
      .limit(1);
    return row ? fromDb(row) : null;
  }

  async reserveForEpisode(tenantId: string, bedId: string, episodeId: string) {
    const bed = await this.getById(tenantId, bedId);
    if (!bed || !canReserve(bed, episodeId)) return null;
    const [row] = await this.db
      .update(beds)
      .set({
        bed_status: "reserved",
        reserved_for_episode_id: episodeId,
        updated_at: new Date(),
      })
      .where(and(eq(beds.iq_tenant_id, tenantId), eq(beds.id, bedId)))
      .returning();
    return row ? fromDb(row) : null;
  }

  async occupyForEpisode(
    tenantId: string,
    bedId: string,
    episodeId: string,
    patientId: string,
  ) {
    const bed = await this.getById(tenantId, bedId);
    if (!bed || !canOccupy(bed, episodeId)) return null;
    const [row] = await this.db
      .update(beds)
      .set({
        bed_status: "occupied",
        current_patient_id: patientId,
        current_episode_id: episodeId,
        reserved_for_episode_id: null,
        updated_at: new Date(),
      })
      .where(and(eq(beds.iq_tenant_id, tenantId), eq(beds.id, bedId)))
      .returning();
    return row ? fromDb(row) : null;
  }

  async releaseReservation(tenantId: string, bedId: string, episodeId: string) {
    const bed = await this.getById(tenantId, bedId);
    if (!bed || bed.bed_status !== "reserved" || bed.reserved_for_episode_id !== episodeId) {
      return;
    }
    await this.db
      .update(beds)
      .set({
        bed_status: "available",
        reserved_for_episode_id: null,
        updated_at: new Date(),
      })
      .where(and(eq(beds.iq_tenant_id, tenantId), eq(beds.id, bedId)));
  }
}

export function createBedRepo(db: DbInstance | undefined, useMock: boolean): BedRepo {
  return useMock || !db ? new InMemoryBedRepo() : new DrizzleBedRepo(db);
}
