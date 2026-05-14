import type { DbInstance } from "@hims/ts-sdk-db";
import { and, asc, desc, eq, ilike, or, sql } from "@hims/ts-sdk-db";
import { patients } from "../schema/tables.js";
import type { PatientRepo } from "../ports.js";
import type {
  Patient,
  CreatePatientData,
  UpdatePatientData,
  PatientFilters,
} from "../domain/patient.types.js";

/** Only these columns may be updated via PATCH; blocks id/uhid/iq_tenant_id/status/etc. from request spillover. */
const UPDATE_PATIENT_ALLOWED_KEYS = [
  "salutation",
  "first_name",
  "middle_name",
  "last_name",
  "father_name",
  "mother_name",
  "date_of_birth",
  "year_of_birth",
  "age_years",
  "age_months",
  "age_days",
  "gender",
  "phone_number",
  "alternate_phone",
  "blood_group",
  "occupation",
  "nationality",
  "education",
  "emergency_contact_name",
  "emergency_contact_relationship",
  "emergency_contact_phone",
  "abha_number",
  "updated_by",
] as const satisfies readonly (keyof UpdatePatientData)[];

export class DrizzlePatientRepo implements PatientRepo {
  constructor(private db: DbInstance) {}

  async findAll(
    tenantId: string,
    filters?: PatientFilters,
  ): Promise<{ data: Patient[]; total: number }> {
    if (!filters) {
      return { data: [], total: 0 };
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(patients.iq_tenant_id, tenantId),
      sql`${patients.merged_into_id} IS NULL`,
    ];

    if (filters.status) {
      conditions.push(eq(patients.status, filters.status));
    }
    if (filters.gender) {
      conditions.push(eq(patients.gender, filters.gender));
    }
    if (filters.phone_any) {
      conditions.push(
        or(
          eq(patients.phone_number, filters.phone_any),
          eq(patients.alternate_phone, filters.phone_any),
        )!,
      );
    }
    if (filters.uhid) {
      conditions.push(eq(patients.uhid, filters.uhid));
    }
    if (filters.abha_number) {
      conditions.push(eq(patients.abha_number, filters.abha_number));
    }
    if (filters.name) {
      conditions.push(ilike(patients.full_name, `%${filters.name}%`));
    }

    const where = and(...conditions);

    const sortCol =
      filters.sort === "updated_at"
        ? patients.updated_at
        : filters.sort === "full_name"
          ? patients.full_name
          : patients.created_at;
    const orderFn = filters.order === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(patients)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(orderFn(sortCol)),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(where),
    ]);

    return {
      data: data as Patient[],
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async findById(tenantId: string, id: string): Promise<Patient | undefined> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.iq_tenant_id, tenantId), eq(patients.id, id)));
    return (rows[0] as Patient) ?? undefined;
  }

  async findByUhid(
    tenantId: string,
    uhid: string,
  ): Promise<Patient | undefined> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.iq_tenant_id, tenantId), eq(patients.uhid, uhid)));
    return (rows[0] as Patient) ?? undefined;
  }

  async findByPhone(tenantId: string, phone: string): Promise<Patient[]> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.iq_tenant_id, tenantId),
          eq(patients.phone_number, phone),
          sql`${patients.merged_into_id} IS NULL`,
        ),
      );
    return rows as Patient[];
  }

  async findDedupCandidates(
    tenantId: string,
    phone: string,
    gender: string,
  ): Promise<Patient[]> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.iq_tenant_id, tenantId),
          eq(patients.phone_number, phone),
          eq(patients.gender, gender),
          sql`${patients.merged_into_id} IS NULL`,
        ),
      );
    return rows as Patient[];
  }

  async create(
    data: CreatePatientData & { uhid: string; full_name: string },
  ): Promise<Patient> {
    const rows = await this.db
      .insert(patients)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        uhid: data.uhid,
        abha_number: data.abha_number ?? null,
        salutation: data.salutation ?? null,
        first_name: data.first_name,
        middle_name: data.middle_name ?? null,
        last_name: data.last_name ?? null,
        full_name: data.full_name,
        father_name: data.father_name ?? null,
        mother_name: data.mother_name ?? null,
        date_of_birth: data.date_of_birth ?? null,
        year_of_birth: data.year_of_birth ?? null,
        age_years: data.age_years ?? null,
        age_months: data.age_months ?? null,
        age_days: data.age_days ?? null,
        gender: data.gender,
        phone_number: data.phone_number,
        alternate_phone: data.alternate_phone ?? null,
        blood_group: data.blood_group ?? null,
        occupation: data.occupation ?? null,
        nationality: data.nationality ?? "Indian",
        education: data.education ?? null,
        emergency_contact_name: data.emergency_contact_name ?? null,
        emergency_contact_relationship:
          data.emergency_contact_relationship ?? null,
        emergency_contact_phone: data.emergency_contact_phone ?? null,
        registered_by: data.registered_by ?? null,
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();
    return rows[0] as Patient;
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdatePatientData,
  ): Promise<Patient | undefined> {
    const existing = await this.findById(tenantId, id);
    if (!existing) return undefined;

    const patch = pickAllowedPatientPatch(data);
    const nameInRequest =
      "first_name" in data ||
      "middle_name" in data ||
      "last_name" in data;

    if (Object.keys(patch).length === 0 && !nameInRequest) {
      return existing;
    }

    const values: Record<string, unknown> = {
      ...patch,
      updated_at: new Date(),
    };

    if (nameInRequest) {
      const first =
        data.first_name !== undefined ? data.first_name : existing.first_name;
      const middle =
        data.middle_name !== undefined ? data.middle_name : existing.middle_name;
      const last =
        data.last_name !== undefined ? data.last_name : existing.last_name;
      values["full_name"] = joinFullName(first, middle, last);
    }

    const rows = await this.db
      .update(patients)
      .set(values)
      .where(and(eq(patients.iq_tenant_id, tenantId), eq(patients.id, id)))
      .returning();
    return (rows[0] as Patient) ?? undefined;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    updatedBy: string | null,
  ): Promise<Patient | undefined> {
    const rows = await this.db
      .update(patients)
      .set({ status, updated_by: updatedBy, updated_at: new Date() })
      .where(and(eq(patients.iq_tenant_id, tenantId), eq(patients.id, id)))
      .returning();
    return (rows[0] as Patient) ?? undefined;
  }
}

function pickAllowedPatientPatch(
  data: UpdatePatientData,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of UPDATE_PATIENT_ALLOWED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    out[key] = data[key];
  }
  return out;
}

function joinFullName(
  first: string,
  middle: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first.trim(), middle?.trim(), last?.trim()].filter(Boolean).join(" ");
}
