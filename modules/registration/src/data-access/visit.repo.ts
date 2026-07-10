import { randomUUID } from "node:crypto";
import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray, isPostgresUniqueViolation, sql } from "@hims/ts-sdk-db";
import { asc, desc } from "drizzle-orm";
import { registrations, visits } from "../schema/tables.js";
import type { VisitRepo } from "../ports.js";
import type { DashboardRepoMetrics } from "../domain/dashboard.types.js";
import type {
  CreateVisitInput,
  ListVisitsParams,
  UpdateVisitInput,
  VisitRecord,
} from "../domain/visit.types.js";
import type { ConsultationType } from "../lib/follow-up.js";
import type { VisitStatus } from "../lib/visit-helpers.js";

const visitNorm = sql`regexp_replace(lower(trim(coalesce(${visits.visit_type}, ''))), '[^a-z0-9]', '', 'g')`;
const newVisitNorms = sql`${visitNorm} in ('opdfirst')`;
const followUpVisitNorms = sql`${visitNorm} in ('opdfollowup')`;
const dayBucket = sql`date_trunc('day', ${visits.created_at} AT TIME ZONE 'Asia/Kolkata')`;
const todayStartIst = sql`(date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')`;

function mapRow(row: typeof visits.$inferSelect): VisitRecord {
  return {
    ...row,
    consultation_type: (row.consultation_type ?? "new") as ConsultationType,
    is_free_follow_up: row.is_free_follow_up ?? false,
    free_follow_up_visit_count: row.free_follow_up_visit_count ?? 0,
    free_follow_up_valid_till: row.free_follow_up_valid_till ?? null,
    free_follow_up_details: (row.free_follow_up_details as VisitRecord["free_follow_up_details"]) ?? null,
    parent_visit_id: row.parent_visit_id ?? null,
    status: row.status as VisitStatus,
  };
}

export class DrizzleVisitRepo implements VisitRepo {
  constructor(private readonly db: DbInstance) {}

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<VisitRecord | undefined> {
    const rows = await this.db
      .select()
      .from(visits)
      .where(
        and(
          eq(visits.iq_tenant_id, tenantId),
          eq(visits.idempotency_key, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async insert(
    tenantId: string,
    input: CreateVisitInput,
    formattedVisitId: string,
    idempotencyKey: string,
    actorId: string,
    status: VisitStatus,
  ) {
    const existing = await this.findByIdempotencyKey(tenantId, idempotencyKey);
    if (existing) {
      return { record: existing, created: false as const };
    }

    try {
      const rows = await this.db
        .insert(visits)
        .values({
          id: randomUUID(),
          iq_tenant_id: tenantId,
          visit_id: formattedVisitId,
          patient_id: input.patient_id,
          visit_type: input.visit_type ?? null,
          consultation_type: input.consultation_type ?? "new",
          is_free_follow_up: input.is_free_follow_up ?? false,
          free_follow_up_visit_count: input.free_follow_up_visit_count ?? 0,
          free_follow_up_valid_till: input.free_follow_up_valid_till ?? null,
          free_follow_up_details: input.free_follow_up_details ?? null,
          parent_visit_id: input.parent_visit_id ?? null,
          facility_id: input.facility_id ?? null,
          department_id: input.department_id ?? null,
          doctor_id: input.doctor_id ?? null,
          appointment_id: input.appointment_id ?? null,
          status,
          idempotency_key: idempotencyKey,
          created_by: actorId,
          updated_by: actorId,
        })
        .returning();
      return { record: mapRow(rows[0]!), created: true as const };
    } catch (err) {
      // A concurrent intake with the same idempotency key can win the partial
      // unique-index race after our pre-check passed; recover by replaying the
      // committed row. drizzle wraps the pg error, so unwrap `.cause` to see the
      // 23505 (a top-level-only check silently misses it — the retry never fires).
      if (isPostgresUniqueViolation(err)) {
        const replayed = await this.findByIdempotencyKey(tenantId, idempotencyKey);
        if (replayed) {
          return { record: replayed, created: false as const };
        }
      }
      throw err;
    }
  }

  async findById(tenantId: string, visitId: string): Promise<VisitRecord | undefined> {
    const rows = await this.db
      .select()
      .from(visits)
      .where(and(eq(visits.iq_tenant_id, tenantId), eq(visits.id, visitId)));
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async listPage(
    tenantId: string,
    params: ListVisitsParams,
  ): Promise<{ rows: VisitRecord[]; total: number }> {
    const page = params.page;
    const limit = params.limit;
    const offset = (page - 1) * limit;

    const conditions = [eq(visits.iq_tenant_id, tenantId)];

    if (params.status) {
      conditions.push(eq(visits.status, params.status));
    }
    if (params.patient_id) {
      conditions.push(eq(visits.patient_id, params.patient_id));
    }
    if (params.facility_id) {
      conditions.push(eq(visits.facility_id, params.facility_id));
    }
    if (params.department_id) {
      conditions.push(eq(visits.department_id, params.department_id));
    }
    if (params.doctor_id) {
      conditions.push(eq(visits.doctor_id, params.doctor_id));
    }
    if (params.updated_from) {
      conditions.push(sql`date(${visits.updated_at}) >= ${params.updated_from}::date`);
    }
    if (params.updated_to) {
      conditions.push(sql`date(${visits.updated_at}) <= ${params.updated_to}::date`);
    }

    const where = and(...conditions);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(visits)
        .where(where)
        .orderBy(desc(visits.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(visits)
        .where(where),
    ]);

    return {
      rows: data.map(mapRow),
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async update(
    tenantId: string,
    visitId: string,
    input: UpdateVisitInput,
    actorId: string,
  ): Promise<VisitRecord | undefined> {
    const patch: Partial<typeof visits.$inferInsert> = {
      updated_by: actorId,
      updated_at: new Date(),
    };

    if (input.visit_type !== undefined) patch.visit_type = input.visit_type;
    if (input.facility_id !== undefined) patch.facility_id = input.facility_id;
    if (input.department_id !== undefined) patch.department_id = input.department_id;
    if (input.doctor_id !== undefined) patch.doctor_id = input.doctor_id;
    if (input.appointment_id !== undefined) patch.appointment_id = input.appointment_id;

    const rows = await this.db
      .update(visits)
      .set(patch)
      .where(and(eq(visits.iq_tenant_id, tenantId), eq(visits.id, visitId)))
      .returning();
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async delete(tenantId: string, visitId: string): Promise<boolean> {
    const rows = await this.db
      .delete(visits)
      .where(and(eq(visits.iq_tenant_id, tenantId), eq(visits.id, visitId)))
      .returning({ id: visits.id });
    return rows.length > 0;
  }

  async updateStatus(
    tenantId: string,
    visitId: string,
    toStatus: VisitStatus,
    actorId: string,
  ): Promise<VisitRecord | undefined> {
    const rows = await this.db
      .update(visits)
      .set({
        status: toStatus,
        updated_by: actorId,
        updated_at: new Date(),
      })
      .where(and(eq(visits.iq_tenant_id, tenantId), eq(visits.id, visitId)))
      .returning();
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async findLatestByPatientId(
    tenantId: string,
    patientId: string,
  ): Promise<VisitRecord | undefined> {
    const rows = await this.db
      .select()
      .from(visits)
      .where(
        and(eq(visits.iq_tenant_id, tenantId), eq(visits.patient_id, patientId)),
      )
      .orderBy(desc(visits.created_at))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async findLatestByPatientIds(
    tenantId: string,
    patientIds: readonly string[],
  ): Promise<Map<string, VisitRecord>> {
    const uniqueIds = [...new Set(patientIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const rows = await this.db
      .select()
      .from(visits)
      .where(and(eq(visits.iq_tenant_id, tenantId), inArray(visits.patient_id, uniqueIds)))
      .orderBy(asc(visits.patient_id), desc(visits.created_at));

    const latestByPatient = new Map<string, VisitRecord>();
    for (const row of rows) {
      if (!latestByPatient.has(row.patient_id)) {
        latestByPatient.set(row.patient_id, mapRow(row));
      }
    }
    return latestByPatient;
  }

  async findLatestByPatientAndDepartment(
    tenantId: string,
    patientId: string,
    departmentId: string,
  ): Promise<VisitRecord | undefined> {
    const rows = await this.db
      .select()
      .from(visits)
      .where(
        and(
          eq(visits.iq_tenant_id, tenantId),
          eq(visits.patient_id, patientId),
          eq(visits.department_id, departmentId),
        ),
      )
      .orderBy(desc(visits.created_at))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async countFreeFollowUpVisits(
    tenantId: string,
    patientId: string,
    departmentId: string,
  ): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(visits)
      .where(
        and(
          eq(visits.iq_tenant_id, tenantId),
          eq(visits.patient_id, patientId),
          eq(visits.department_id, departmentId),
          eq(visits.consultation_type, "free-followup"),
          sql`${visits.status} <> 'cancelled'`,
        ),
      );
    return Number(rows[0]?.count ?? 0);
  }

  async getDashboardMetrics(tenantId: string, days: number): Promise<DashboardRepoMetrics> {
    const tenant = eq(visits.iq_tenant_id, tenantId);
    const footfallSince = sql`${visits.created_at} >= ${todayStartIst} - (${days}::int - 1) * INTERVAL '1 day'`;
    const todaySince = sql`${visits.created_at} >= ${todayStartIst}`;

    const [statsRow, footfallRows, todayRows] = await Promise.all([
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          new_patients: sql<number>`count(*) filter (where ${newVisitNorms})::int`,
          follow_ups: sql<number>`count(*) filter (where ${followUpVisitNorms})::int`,
        })
        .from(visits)
        .where(tenant),
      this.db
        .select({
          date: sql<string>`to_char(${dayBucket}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(visits)
        .where(and(tenant, footfallSince))
        .groupBy(dayBucket)
        .orderBy(dayBucket),
      this.db
        .select({
          visit_id: visits.visit_id,
          registration_id: registrations.registration_id,
          patient_name: sql<string>`coalesce(${registrations.patient_full_name}, 'Unknown')`,
          created_at: visits.created_at,
          visit_status: visits.status,
        })
        .from(visits)
        .leftJoin(
          registrations,
          and(
            eq(registrations.iq_tenant_id, visits.iq_tenant_id),
            eq(registrations.patient_id, visits.patient_id),
          ),
        )
        .where(and(tenant, todaySince))
        .orderBy(desc(visits.created_at))
        .limit(50),
    ]);

    const todays_visits = todayRows.map((row) => ({
      visit_id: row.visit_id,
      registration_id: row.registration_id ?? "",
      patient_name: row.patient_name,
      created_at: row.created_at,
      visit_status: row.visit_status,
    }));

    return {
      total: Number(statsRow[0]?.total ?? 0),
      new_patients: Number(statsRow[0]?.new_patients ?? 0),
      follow_ups: Number(statsRow[0]?.follow_ups ?? 0),
      footfall: footfallRows.map((r) => ({ date: r.date, count: Number(r.count) })),
      todays_visits,
    };
  }
}
