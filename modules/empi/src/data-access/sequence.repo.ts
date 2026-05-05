import { eq, and, sql } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { sequenceCounters } from "../schema/tables.js";
import type { SequenceRepo } from "../ports.js";

export class DrizzleSequenceRepo implements SequenceRepo {
  constructor(private db: DbInstance) {}

  async nextValue(tenantId: string, sequenceName: string): Promise<number> {
    const result = await this.db
      .insert(sequenceCounters)
      .values({
        iq_tenant_id: tenantId,
        sequence_name: sequenceName,
        current_value: 1,
      })
      .onConflictDoUpdate({
        target: [sequenceCounters.iq_tenant_id, sequenceCounters.sequence_name],
        set: {
          current_value: sql`${sequenceCounters.current_value} + 1`,
        },
      })
      .returning({ current_value: sequenceCounters.current_value });

    return result[0]!.current_value;
  }
}
