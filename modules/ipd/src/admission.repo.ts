import { and, desc, eq, ilike, inArray, or, sql, type DbInstance } from "@hims/ts-sdk-db";
import { admissions } from "./schema/tables.js";
import type { Admission, AdmissionListQuery, AdmissionRepo, DashboardStats } from "./domain/admission.js";

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

function matches(row: Admission, q: AdmissionListQuery): boolean {
  if (q.status?.length && !q.status.includes(row.status)) return false;
  if (q.admission_source && row.admission_source !== q.admission_source) return false;
  if (q.admission_type && row.admission_type !== q.admission_type) return false;
  if (q.facility_id && row.facility_id !== q.facility_id) return false;
  if (q.intended_ward_code && row.intended_ward_code !== q.intended_ward_code) return false;
  if (q.q?.trim()) {
    const t = q.q.trim().toLowerCase();
    const hay = `${row.admission_number} ${row.patient_uhid} ${row.patient_full_name} ${row.patient_phone ?? ""}`.toLowerCase();
    if (!hay.includes(t)) return false;
  }
  return true;
}

function stats(rows: Admission[]): DashboardStats {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const out: DashboardStats = {
    admissions_today: 0,
    discharges_today: 0,
    pending_admissions: 0,
    active_admissions: 0,
    deposit_clearance_pending: 0,
  };

  for (const r of rows) {
    if (r.status === "pending") out.pending_admissions++;
    if (r.status === "active") {
      out.active_admissions++;
      if (r.deposit_required && !r.deposit_collected_at) out.deposit_clearance_pending++;
    }
    if (r.admission_datetime) {
      const d = new Date(r.admission_datetime);
      if (d >= start && d < end && (r.status === "active" || r.status === "discharged")) out.admissions_today++;
    }
    if (r.status === "discharged") {
      const d = new Date(r.updated_at);
      if (d >= start && d < end) out.discharges_today++;
    }
  }
  return out;
}

function fromDb(row: typeof admissions.$inferSelect): Admission {
  return {
    ...row,
    admission_type: row.admission_type as Admission["admission_type"],
    admission_source: row.admission_source as Admission["admission_source"],
    status: row.status as Admission["status"],
    payer_type: row.payer_type as Admission["payer_type"],
    admission_datetime: row.admission_datetime?.toISOString() ?? null,
    expected_discharge_date: row.expected_discharge_date ?? null,
    deposit_collected_at: row.deposit_collected_at?.toISOString() ?? null,
    bed_assigned_at: row.bed_assigned_at?.toISOString() ?? null,
    patient_date_of_birth: row.patient_date_of_birth ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/** In-memory store — default for Swagger (`IPD_USE_MOCK_DATA=true`). */
export class InMemoryAdmissionRepo implements AdmissionRepo {
  private store = new Map<string, Admission>();

  private k(tenantId: string, id: string) {
    return `${tenantId}:${id}`;
  }

  private tenantRows(tenantId: string) {
    return [...this.store.values()].filter((r) => r.iq_tenant_id === tenantId);
  }

  async list(tenantId: string, query: AdmissionListQuery) {
    const rows = this.tenantRows(tenantId)
      .filter((r) => matches(r, query))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return paginate(rows, query.page, query.limit);
  }

  async getById(tenantId: string, admissionId: string) {
    return this.store.get(this.k(tenantId, admissionId)) ?? null;
  }

  async getByIdempotencyKey(tenantId: string, key: string) {
    return this.tenantRows(tenantId).find((r) => r.idempotency_key === key) ?? null;
  }

  async getByRegistrationVisitId(tenantId: string, visitId: string) {
    return this.tenantRows(tenantId).find((r) => r.registration_visit_id === visitId) ?? null;
  }

  async insert(row: Admission) {
    this.store.set(this.k(row.iq_tenant_id, row.admission_id), row);
    return row;
  }

  async update(tenantId: string, admissionId: string, patch: Partial<Admission>) {
    const cur = await this.getById(tenantId, admissionId);
    if (!cur) return null;
    const next = { ...cur, ...patch, updated_at: new Date().toISOString() };
    this.store.set(this.k(tenantId, admissionId), next);
    return next;
  }

  async dashboardStats(tenantId: string) {
    return stats(this.tenantRows(tenantId));
  }

  async nextAdmissionNumber(tenantId: string) {
    const n = (seq.get(tenantId) ?? 0) + 1;
    seq.set(tenantId, n);
    return `IP-${String(n).padStart(5, "0")}`;
  }
}

/** Postgres via Drizzle — set `IPD_USE_MOCK_DATA=false` + run `nx run ipd:db-migrate`. */
export class DrizzleAdmissionRepo implements AdmissionRepo {
  constructor(private db: DbInstance) {}

  async list(tenantId: string, query: AdmissionListQuery) {
    const cond = [eq(admissions.iq_tenant_id, tenantId)];
    if (query.status?.length) cond.push(inArray(admissions.status, query.status));
    if (query.admission_source) cond.push(eq(admissions.admission_source, query.admission_source));
    if (query.admission_type) cond.push(eq(admissions.admission_type, query.admission_type));
    if (query.facility_id) cond.push(eq(admissions.facility_id, query.facility_id));
    if (query.intended_ward_code) cond.push(eq(admissions.intended_ward_code, query.intended_ward_code));
    if (query.q?.trim()) {
      const t = `%${query.q.trim()}%`;
      cond.push(or(ilike(admissions.admission_number, t), ilike(admissions.patient_uhid, t), ilike(admissions.patient_full_name, t), ilike(admissions.patient_phone, t))!);
    }
    const where = and(...cond);
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)::int` }).from(admissions).where(where);
    const rows = await this.db.select().from(admissions).where(where).orderBy(desc(admissions.updated_at)).limit(query.limit).offset((query.page - 1) * query.limit);
    const total = count ?? 0;
    return { data: rows.map(fromDb), total, page: query.page, limit: query.limit, total_pages: total ? Math.ceil(total / query.limit) : 0 };
  }

  async getById(tenantId: string, admissionId: string) {
    const [row] = await this.db.select().from(admissions).where(and(eq(admissions.iq_tenant_id, tenantId), eq(admissions.admission_id, admissionId))).limit(1);
    return row ? fromDb(row) : null;
  }

  async getByIdempotencyKey(tenantId: string, key: string) {
    const [row] = await this.db.select().from(admissions).where(and(eq(admissions.iq_tenant_id, tenantId), eq(admissions.idempotency_key, key))).limit(1);
    return row ? fromDb(row) : null;
  }

  async getByRegistrationVisitId(tenantId: string, visitId: string) {
    const [row] = await this.db.select().from(admissions).where(and(eq(admissions.iq_tenant_id, tenantId), eq(admissions.registration_visit_id, visitId))).limit(1);
    return row ? fromDb(row) : null;
  }

  async insert(row: Admission) {
    const [r] = await this.db.insert(admissions).values({ ...row, created_at: new Date(row.created_at), updated_at: new Date(row.updated_at), admission_datetime: row.admission_datetime ? new Date(row.admission_datetime) : null, deposit_collected_at: row.deposit_collected_at ? new Date(row.deposit_collected_at) : null, bed_assigned_at: row.bed_assigned_at ? new Date(row.bed_assigned_at) : null }).returning();
    if (!r) throw new Error("insert failed");
    return fromDb(r);
  }

  async update(tenantId: string, admissionId: string, patch: Partial<Admission>) {
    const values: Record<string, unknown> = { updated_at: new Date() };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || k === "admission_id" || k === "iq_tenant_id") continue;
      values[k] = k.endsWith("_at") && typeof v === "string" ? new Date(v) : v;
    }
    const [r] = await this.db.update(admissions).set(values).where(and(eq(admissions.iq_tenant_id, tenantId), eq(admissions.admission_id, admissionId))).returning();
    return r ? fromDb(r) : null;
  }

  async dashboardStats(tenantId: string) {
    const rows = await this.db.select().from(admissions).where(eq(admissions.iq_tenant_id, tenantId));
    return stats(rows.map(fromDb));
  }

  async nextAdmissionNumber(tenantId: string) {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)::int` }).from(admissions).where(eq(admissions.iq_tenant_id, tenantId));
    return `IP-${String((count ?? 0) + 1).padStart(5, "0")}`;
  }
}

export function createAdmissionRepo(db: DbInstance | undefined, useMock: boolean): AdmissionRepo {
  return useMock || !db ? new InMemoryAdmissionRepo() : new DrizzleAdmissionRepo(db);
}
