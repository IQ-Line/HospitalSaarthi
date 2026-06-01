import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, sql } from "@hims/ts-sdk-db";
import { desc } from "drizzle-orm";
import { visits } from "../schema/tables.js";
import type { VisitRepo } from "../ports.js";
import type {
  CreateVisitInput,
  ListVisitsParams,
  UpdateVisitInput,
  VisitRecord,
} from "../domain/visit.types.js";
import type { VisitStatus } from "../lib/visit-helpers.js";

function mapRow(row: typeof visits.$inferSelect): VisitRecord {
  return {
    ...row,
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
          iq_tenant_id: tenantId,
          patient_id: input.patient_id,
          visit_type: input.visit_type ?? null,
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

  async findById(tenantId: string, visitId: string): Promise<VisitRecord | undefined> {
    const rows = await this.db
      .select()
      .from(visits)
      .where(and(eq(visits.iq_tenant_id, tenantId), eq(visits.visit_id, visitId)));
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
      .where(and(eq(visits.iq_tenant_id, tenantId), eq(visits.visit_id, visitId)))
      .returning();
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async delete(tenantId: string, visitId: string): Promise<boolean> {
    const rows = await this.db
      .delete(visits)
      .where(and(eq(visits.iq_tenant_id, tenantId), eq(visits.visit_id, visitId)))
      .returning({ visit_id: visits.visit_id });
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
      .where(and(eq(visits.iq_tenant_id, tenantId), eq(visits.visit_id, visitId)))
      .returning();
    return rows[0] ? mapRow(rows[0]) : undefined;
  }
}
