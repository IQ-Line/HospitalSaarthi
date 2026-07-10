import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, isPostgresUniqueViolation, sql } from "@hims/ts-sdk-db";
import { desc, ilike, or } from "drizzle-orm";
import { registrations } from "../schema/tables.js";
import type { RegistrationRepo } from "../ports.js";
import type {
  CreateRegistrationInput,
  ListRegistrationsParams,
  RegistrationRecord,
} from "../domain/registration.types.js";

function mapRow(row: typeof registrations.$inferSelect): RegistrationRecord {
  return {
    ...row,
    patient_date_of_birth: row.patient_date_of_birth ?? null,
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

  async findByPatientId(
    tenantId: string,
    patientId: string,
  ): Promise<RegistrationRecord | undefined> {
    const rows = await this.db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.iq_tenant_id, tenantId),
          eq(registrations.patient_id, patientId),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async findPatientIdByAbhaAddress(
    tenantId: string,
    abhaAddress: string,
  ): Promise<string | undefined> {
    const ids = await this.findAllPatientIdsByAbhaAddress(tenantId, abhaAddress);
    return ids[0];
  }

  async findAllPatientIdsByAbhaAddress(
    tenantId: string,
    abhaAddress: string,
  ): Promise<string[]> {
    const value = abhaAddress.trim();
    if (!value) return [];
    const rows = await this.db
      .select({ patient_id: registrations.patient_id })
      .from(registrations)
      .where(
        and(
          eq(registrations.iq_tenant_id, tenantId),
          sql`trim(${registrations.patient_abha_address}) = ${value}`,
        ),
      );
    return [...new Set(rows.map((row) => row.patient_id))];
  }

  /** Refresh desk-captured ABHA / DOB on an existing registration row (re-intake). */
  async patchSnapshotDemographics(
    tenantId: string,
    patientId: string,
    snapshot: ReturnType<typeof snapshotValues>,
    actorId: string,
  ): Promise<RegistrationRecord | undefined> {
    const hasAbha =
      snapshot.patient_abha_address?.trim() || snapshot.patient_abha_number?.trim();
    const hasYob = snapshot.patient_year_of_birth != null;
    if (!hasAbha && !hasYob) {
      return this.findByPatientId(tenantId, patientId);
    }

    const patch: Record<string, unknown> = {
      updated_by: actorId,
      updated_at: sql`now()`,
    };
    const abhaAddr = snapshot.patient_abha_address?.trim();
    if (abhaAddr) patch.patient_abha_address = abhaAddr;
    const abhaNum = snapshot.patient_abha_number?.trim();
    if (abhaNum) patch.patient_abha_number = abhaNum;
    if (snapshot.patient_year_of_birth != null) {
      patch.patient_year_of_birth = snapshot.patient_year_of_birth;
    }
    if (snapshot.patient_date_of_birth) {
      patch.patient_date_of_birth = snapshot.patient_date_of_birth;
    }

    const rows = await this.db
      .update(registrations)
      .set(patch as typeof registrations.$inferInsert)
      .where(
        and(
          eq(registrations.iq_tenant_id, tenantId),
          eq(registrations.patient_id, patientId),
        ),
      )
      .returning();
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async insert(
    tenantId: string,
    input: CreateRegistrationInput,
    idempotencyKey: string,
    actorId: string,
  ) {
    const existing = await this.findByIdempotencyKey(tenantId, idempotencyKey);
    if (existing) {
      return { record: existing, created: false as const };
    }

    const existingPatient = await this.findByPatientId(tenantId, input.patient_id);
    if (existingPatient) {
      const snapshot = snapshotValues(input);
      const patched = await this.patchSnapshotDemographics(
        tenantId,
        input.patient_id,
        snapshot,
        actorId,
      );
      return { record: patched ?? existingPatient, created: false as const };
    }

    try {
      const rows = await this.db
        .insert(registrations)
        .values({
          iq_tenant_id: tenantId,
          patient_id: input.patient_id,
          ...snapshotValues(input),
          idempotency_key: idempotencyKey,
          created_by: actorId,
          updated_by: actorId,
        })
        .returning();
      return { record: mapRow(rows[0]!), created: true as const };
    } catch (err) {
      // A concurrent intake can win the (idempotency_key) or (patient_id) unique
      // race after both our pre-checks passed; recover by replaying the committed
      // row (by key, else by patient). drizzle wraps the pg error, so unwrap
      // `.cause` for the 23505 — a top-level-only check silently misses it.
      if (isPostgresUniqueViolation(err)) {
        const replayed =
          (await this.findByIdempotencyKey(tenantId, idempotencyKey)) ??
          (await this.findByPatientId(tenantId, input.patient_id));
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

    if (params.patient_id) {
      conditions.push(eq(registrations.patient_id, params.patient_id));
    }

    const q = params.q?.trim();
    const uhid = params.uhid?.trim();
    const mobile = params.mobile?.trim();
    const name = params.name?.trim();
    const abhaNumber = params.abha_number?.trim();
    const abhaAddress = params.abha_address?.trim();

    if (abhaNumber) {
      conditions.push(ilike(registrations.patient_abha_number, `%${abhaNumber}%`));
    } else if (abhaAddress) {
      conditions.push(ilike(registrations.patient_abha_address, `%${abhaAddress}%`));
    } else if (uhid) {
      conditions.push(ilike(registrations.patient_uhid, `%${uhid}%`));
    } else if (mobile) {
      const digits = mobile.replace(/\D/g, "");
      const tail = digits.slice(-10);
      if (tail.length === 10) {
        conditions.push(ilike(registrations.patient_phone_number, `%${tail}`));
      }
    } else if (name && name.length >= 2) {
      conditions.push(ilike(registrations.patient_full_name, `%${name}%`));
    } else if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(registrations.patient_uhid, pattern),
          ilike(registrations.patient_phone_number, pattern),
          ilike(registrations.patient_full_name, pattern),
          ilike(registrations.patient_abha_number, pattern),
          ilike(registrations.patient_abha_address, pattern),
        )!,
      );
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
}
