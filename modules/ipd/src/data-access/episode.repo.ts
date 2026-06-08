import { and, desc, eq, ilike, inArray, or, sql, type DbInstance } from "@hims/ts-sdk-db";
import { episodes } from "../schema/tables.js";
import type { Episode, EpisodeListQuery, EpisodeRepo, DashboardStats } from "../domain/episode.js";
import { ALLOWED_PATCH_FIELDS } from "../domain/episode.js";

const seq = new Map<string, number>();

function paginate<T>(rows: T[], page: number, limit: number) {
  const total = rows.length;
  return {
    data: rows.slice((page - 1) * limit, page * limit),
    total,
    page,
    limit,
    total_pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function matches(row: Episode, q: EpisodeListQuery): boolean {
  if (q.status?.length && !q.status.includes(row.status)) return false;
  if (q.admission_source && row.admission_source !== q.admission_source) return false;
  if (q.admission_type && row.admission_type !== q.admission_type) return false;
  if (q.ward_id && row.ward_id !== q.ward_id) return false;
  if (q.q?.trim()) {
    const t = q.q.trim().toLowerCase();
    const hay = `${row.episode_number} ${row.patient_name}`.toLowerCase();
    if (!hay.includes(t)) return false;
  }
  return true;
}

// TODO(Phase 1): push dashboard aggregates to SQL (COUNT … GROUP BY status) instead of scanning all rows.
function stats(rows: Episode[]): DashboardStats {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const out: DashboardStats = {
    admissions_today: 0,
    discharges_today: 0,
    scheduled_episodes: 0,
    active_episodes: 0,
  };

  for (const r of rows) {
    if (r.status === "scheduled") out.scheduled_episodes++;
    if (r.status === "admitted") out.active_episodes++;
    if (r.admitted_at) {
      const d = new Date(r.admitted_at);
      if (d >= start && d < end) out.admissions_today++;
    }
    if (r.discharged_at) {
      const d = new Date(r.discharged_at);
      if (d >= start && d < end) out.discharges_today++;
    }
  }
  return out;
}

function fromDb(row: typeof episodes.$inferSelect): Episode {
  return {
    ...row,
    admission_type: row.admission_type as Episode["admission_type"],
    admission_source: row.admission_source as Episode["admission_source"],
    status: row.status as Episode["status"],
    financial_class: row.financial_class as Episode["financial_class"],
    closure_type: row.closure_type as Episode["closure_type"],
    admitted_at: row.admitted_at?.toISOString() ?? null,
    discharged_at: row.discharged_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function pickPatchValues(patch: Partial<Episode>): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const key of ALLOWED_PATCH_FIELDS) {
    if (patch[key] !== undefined) {
      values[key] = patch[key];
    }
  }
  return values;
}

function episodeNumberSuffix(n: number): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `IPD-${ymd}-${String(n).padStart(4, "0")}`;
}

/** In-memory store — default for Swagger (`IPD_USE_MOCK_DATA=true`). */
export class InMemoryEpisodeRepo implements EpisodeRepo {
  private store = new Map<string, Episode>();

  private k(tenantId: string, id: string) {
    return `${tenantId}:${id}`;
  }

  private tenantRows(tenantId: string) {
    return [...this.store.values()].filter((r) => r.iq_tenant_id === tenantId);
  }

  async list(tenantId: string, query: EpisodeListQuery) {
    const rows = this.tenantRows(tenantId)
      .filter((r) => matches(r, query))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return paginate(rows, query.page, query.limit);
  }

  async getById(tenantId: string, episodeId: string) {
    return this.store.get(this.k(tenantId, episodeId)) ?? null;
  }

  async getByIdempotencyKey(tenantId: string, key: string) {
    return this.tenantRows(tenantId).find((r) => r.idempotency_key === key) ?? null;
  }

  async getByVisitId(tenantId: string, visitId: string) {
    return this.tenantRows(tenantId).find((r) => r.visit_id === visitId) ?? null;
  }

  async insert(row: Episode) {
    this.store.set(this.k(row.iq_tenant_id, row.id), row);
    return row;
  }

  async update(tenantId: string, episodeId: string, patch: Partial<Episode>) {
    const cur = await this.getById(tenantId, episodeId);
    if (!cur) return null;
    const allowed = pickPatchValues(patch);
    const next = { ...cur, ...allowed, updated_at: new Date().toISOString() } as Episode;
    this.store.set(this.k(tenantId, episodeId), next);
    return next;
  }

  async dashboardStats(tenantId: string) {
    return stats(this.tenantRows(tenantId));
  }

  async nextEpisodeNumber(tenantId: string) {
    const n = (seq.get(tenantId) ?? 0) + 1;
    seq.set(tenantId, n);
    return episodeNumberSuffix(n);
  }
}

/** Postgres via Drizzle — set `IPD_USE_MOCK_DATA=false` + run `nx run ipd:db-migrate`. */
export class DrizzleEpisodeRepo implements EpisodeRepo {
  constructor(private db: DbInstance) {}

  async list(tenantId: string, query: EpisodeListQuery) {
    const cond = [eq(episodes.iq_tenant_id, tenantId)];
    if (query.status?.length) cond.push(inArray(episodes.status, query.status));
    if (query.admission_source) cond.push(eq(episodes.admission_source, query.admission_source));
    if (query.admission_type) cond.push(eq(episodes.admission_type, query.admission_type));
    if (query.ward_id) cond.push(eq(episodes.ward_id, query.ward_id));
    if (query.q?.trim()) {
      const t = `%${query.q.trim()}%`;
      cond.push(
        or(ilike(episodes.episode_number, t), ilike(episodes.patient_name, t))!,
      );
    }
    const where = and(...cond);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(episodes)
      .where(where);
    const rows = await this.db
      .select()
      .from(episodes)
      .where(where)
      .orderBy(desc(episodes.updated_at))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);
    const total = count ?? 0;
    return {
      data: rows.map(fromDb),
      total,
      page: query.page,
      limit: query.limit,
      total_pages: total ? Math.ceil(total / query.limit) : 0,
    };
  }

  async getById(tenantId: string, episodeId: string) {
    const [row] = await this.db
      .select()
      .from(episodes)
      .where(and(eq(episodes.iq_tenant_id, tenantId), eq(episodes.id, episodeId)))
      .limit(1);
    return row ? fromDb(row) : null;
  }

  async getByIdempotencyKey(tenantId: string, key: string) {
    const [row] = await this.db
      .select()
      .from(episodes)
      .where(and(eq(episodes.iq_tenant_id, tenantId), eq(episodes.idempotency_key, key)))
      .limit(1);
    return row ? fromDb(row) : null;
  }

  async getByVisitId(tenantId: string, visitId: string) {
    const [row] = await this.db
      .select()
      .from(episodes)
      .where(and(eq(episodes.iq_tenant_id, tenantId), eq(episodes.visit_id, visitId)))
      .limit(1);
    return row ? fromDb(row) : null;
  }

  async insert(row: Episode) {
    const [r] = await this.db
      .insert(episodes)
      .values({
        ...row,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        admitted_at: row.admitted_at ? new Date(row.admitted_at) : null,
        discharged_at: row.discharged_at ? new Date(row.discharged_at) : null,
      })
      .returning();
    if (!r) throw new Error("insert failed");
    return fromDb(r);
  }

  async update(tenantId: string, episodeId: string, patch: Partial<Episode>) {
    const values = { ...pickPatchValues(patch), updated_at: new Date() };
    const [r] = await this.db
      .update(episodes)
      .set(values)
      .where(and(eq(episodes.iq_tenant_id, tenantId), eq(episodes.id, episodeId)))
      .returning();
    return r ? fromDb(r) : null;
  }

  async dashboardStats(tenantId: string) {
    const rows = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.iq_tenant_id, tenantId));
    return stats(rows.map(fromDb));
  }

  // TODO(Phase 1): use tenant-scoped Postgres SEQUENCE (or @hims/ts-sdk-sequence) — count()+1 races under concurrency.
  async nextEpisodeNumber(tenantId: string) {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(episodes)
      .where(eq(episodes.iq_tenant_id, tenantId));
    return episodeNumberSuffix((count ?? 0) + 1);
  }
}

export function createEpisodeRepo(db: DbInstance | undefined, useMock: boolean): EpisodeRepo {
  return useMock || !db ? new InMemoryEpisodeRepo() : new DrizzleEpisodeRepo(db);
}