import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, sql } from "@hims/ts-sdk-db";
import { desc, ilike, or } from "drizzle-orm";
import { registrations } from "../schema/tables.js";
import type { RegistrationRepo } from "../ports.js";
import type { DashboardRepoMetrics, DashboardTodaysVisit } from "../domain/dashboard.types.js";
import type {
  CreateRegistrationInput,
  ListRegistrationsParams,
  RegistrationRecord,
  RegistrationStatus,
} from "../domain/registration.types.js";

/** Normalized visit_type for dashboard buckets (strips punctuation / case). */
const visitNorm = sql`regexp_replace(lower(trim(coalesce(${registrations.visit_type}, ''))), '[^a-z0-9]', '', 'g')`;
/** IST calendar boundaries — timezone must be a SQL literal (not a bind param). */
const dayBucket = sql`date_trunc('day', ${registrations.created_at} AT TIME ZONE 'Asia/Kolkata')`;
const todayStartIst = sql`(date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')`;

function mapRow(row: typeof registrations.$inferSelect): RegistrationRecord {
  return {
    ...row,
    patient_date_of_birth: row.patient_date_of_birth ?? null,
    registration_status: row.registration_status as RegistrationStatus,
  };
}

function snapshotValues(input: CreateRegistrationInput) {
  const s = input.patient_snapshot;
  return {
    patient_uhid: s.uhid,
    patient_abha_number: s.abha_number ?? null,
    patient_abha_address: s.abha_address ?? null,
    patient_full_name: s.full_name,
    patient_phone_number: s.phone_number,
    patient_gender: s.gender ?? null,
    patient_date_of_birth: s.date_of_birth ?? null,
    patient_year_of_birth: s.year_of_birth ?? null,
    patient_source_record_id: input.patient_source_record_id,
  };
}

export class DrizzleRegistrationRepo implements RegistrationRepo {
  constructor(private readonly db: DbInstance) {}

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<RegistrationRecord | undefined> {
    const rows = await this.db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.iq_tenant_id, tenantId),
          eq(registrations.idempotency_key, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async insert(
    tenantId: string,
    input: CreateRegistrationInput,
    idempotencyKey: string,
    actorId: string,
    registrationStatus: RegistrationStatus,
  ) {
    const existing = await this.findByIdempotencyKey(tenantId, idempotencyKey);
    if (existing) {
      return { record: existing, created: false as const };
    }

    try {
      const rows = await this.db
        .insert(registrations)
        .values({
          iq_tenant_id: tenantId,
          patient_id: input.patient_id,
          ...snapshotValues(input),
          facility_id: input.facility_id ?? null,
          visit_type: input.visit_type ?? null,
          department_id: input.department_id ?? null,
          provider_id: input.provider_id ?? null,
          appointment_id: input.appointment_id ?? null,
          visit_id: null,
          registration_status: registrationStatus,
          idempotency_key: idempotencyKey,
          created_by: actorId,
          updated_by: actorId,
        })
        .returning();
      return { record: mapRow(rows[0]!), created: true as const };
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "23505") {
        const replayed = await this.findByIdempotencyKey(tenantId, idempotencyKey);
        if (replayed) {
          return { record: replayed, created: false as const };
        }
      }
      throw err;
    }
  }

  async findById(
    tenantId: string,
    registrationId: string,
  ): Promise<RegistrationRecord | undefined> {
    const rows = await this.db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.iq_tenant_id, tenantId),
          eq(registrations.registration_id, registrationId),
        ),
      );
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async listPage(
    tenantId: string,
    params: ListRegistrationsParams,
  ): Promise<{ rows: RegistrationRecord[]; total: number }> {
    const page = params.page;
    const limit = params.limit;
    const offset = (page - 1) * limit;

    const conditions = [eq(registrations.iq_tenant_id, tenantId)];

    if (params.status) {
      conditions.push(eq(registrations.registration_status, params.status));
    }
    if (params.patient_id) {
      conditions.push(eq(registrations.patient_id, params.patient_id));
    }
    if (params.facility_id) {
      conditions.push(eq(registrations.facility_id, params.facility_id));
    }
    if (params.department_id) {
      conditions.push(eq(registrations.department_id, params.department_id));
    }
    if (params.provider_id) {
      conditions.push(eq(registrations.provider_id, params.provider_id));
    }

    const q = params.q?.trim() || params.uhid?.trim() || params.mobile?.trim();
    const name = params.name?.trim();

    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(registrations.patient_uhid, pattern),
          ilike(registrations.patient_phone_number, pattern),
          ilike(registrations.patient_full_name, pattern),
        )!,
      );
    } else if (name && name.length >= 2) {
      conditions.push(ilike(registrations.patient_full_name, `%${name}%`));
    }

    const where = and(...conditions);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(registrations)
        .where(where)
        .orderBy(desc(registrations.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(registrations)
        .where(where),
    ]);

    return {
      rows: data.map(mapRow),
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async updateStatus(
    tenantId: string,
    registrationId: string,
    toStatus: RegistrationStatus,
    actorId: string,
  ): Promise<RegistrationRecord | undefined> {
    const rows = await this.db
      .update(registrations)
      .set({
        registration_status: toStatus,
        updated_by: actorId,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(registrations.iq_tenant_id, tenantId),
          eq(registrations.registration_id, registrationId),
        ),
      )
      .returning();
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async getDashboardMetrics(tenantId: string, days: number): Promise<DashboardRepoMetrics> {
    const tenant = eq(registrations.iq_tenant_id, tenantId);
    const footfallSince = sql`${registrations.created_at} >= ${todayStartIst} - (${days}::int - 1) * INTERVAL '1 day'`;
    const todaySince = sql`${registrations.created_at} >= ${todayStartIst}`;

    const [statsRow, footfallRows, todayRows] = await Promise.all([
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          new_patients: sql<number>`count(*) filter (where ${visitNorm} in ('opdfirst', 'opdfirstvisit') or ${visitNorm} like '%first%')::int`,
          follow_ups: sql<number>`count(*) filter (where ${visitNorm} in ('opdfollowup', 'opdfollowupvisit') or ${visitNorm} like '%follow%')::int`,
        })
        .from(registrations)
        .where(tenant),
      this.db
        .select({
          date: sql<string>`to_char(${dayBucket}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(registrations)
        .where(and(tenant, footfallSince))
        .groupBy(dayBucket)
        .orderBy(dayBucket),
      this.db
        .select({
          registration_id: registrations.registration_id,
          patient_name: registrations.patient_full_name,
          created_at: registrations.created_at,
          registration_status: registrations.registration_status,
        })
        .from(registrations)
        .where(and(tenant, todaySince))
        .orderBy(desc(registrations.created_at))
        .limit(50),
    ]);

    const todays_visits: DashboardTodaysVisit[] = todayRows.map((row) => ({
      registration_id: row.registration_id,
      patient_name: row.patient_name,
      time: formatIstTime(row.created_at),
      status: mapVisitStatus(row.registration_status),
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

function formatIstTime(at: Date): string {
  return at.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

function mapVisitStatus(
  status: string,
): DashboardTodaysVisit["status"] {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  return "pending";
}
