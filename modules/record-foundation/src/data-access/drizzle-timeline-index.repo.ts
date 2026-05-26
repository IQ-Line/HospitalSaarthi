import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { timelineIndex } from "../schema/tables.js";
import type { TimelineIndexRepo } from "../ports.js";

export class DrizzleTimelineIndexRepo implements TimelineIndexRepo {
  constructor(private db: DbInstance) {}

  async findByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const rows = await this.db
      .select()
      .from(timelineIndex)
      .where(
        and(
          eq(timelineIndex.iq_tenant_id, tenantId),
          eq(timelineIndex.patient_id, patientId),
        ),
      )
      .orderBy(timelineIndex.occurred_at);
    return rows as Array<Record<string, unknown>>;
  }
}
