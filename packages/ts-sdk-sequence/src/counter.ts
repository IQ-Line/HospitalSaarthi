import {
  bigint,
  pgSchema,
  primaryKey,
  text,
  tenantColumn,
  type DbInstance,
  sql,
} from "@hims/ts-sdk-db";

/** Existing EMPI counter table — shared for all config-driven identifiers. */
const empiSchema = pgSchema("empi");

const sequenceCounters = empiSchema.table(
  "sequence_counters",
  {
    ...tenantColumn(),
    sequence_name: text("sequence_name").notNull(),
    current_value: bigint("current_value", { mode: "number" }).notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.sequence_name] })],
);

export async function nextSequenceValue(
  db: DbInstance,
  tenantId: string,
  sequenceName: string,
  startsAt: number,
): Promise<number> {
  const rows = await db
    .insert(sequenceCounters)
    .values({
      iq_tenant_id: tenantId,
      sequence_name: sequenceName,
      current_value: startsAt,
    })
    .onConflictDoUpdate({
      target: [sequenceCounters.iq_tenant_id, sequenceCounters.sequence_name],
      set: {
        current_value: sql`${sequenceCounters.current_value} + 1`,
      },
    })
    .returning({ current_value: sequenceCounters.current_value });

  const value = rows[0]?.current_value;
  if (value == null) {
    throw new Error(`Failed to allocate sequence for ${sequenceName}`);
  }
  return value;
}
