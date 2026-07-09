import {
  bigint,
  pgSchema,
  primaryKey,
  text,
  tenantColumn,
  type DbInstance,
  sql,
} from "@hims/ts-sdk-db";

/**
 * Per-module `<schema>.sequence_counters` table
 * (INSERT ... ON CONFLICT DO UPDATE current_value + 1 — the atomic allocation primitive).
 *
 * Each allocating module OWNS its own counter table in its OWN schema: the caller passes its
 * module schema so no module ever writes into another module's schema (empi no longer holds the
 * shared table for billing/registration). The table shape is identical across schemas; the drizzle
 * table instance is memoized per schema name so repeated calls don't rebuild it.
 */
type SequenceCountersTable = ReturnType<typeof buildSequenceCountersTable>;

function buildSequenceCountersTable(schema: string) {
  return pgSchema(schema).table(
    "sequence_counters",
    {
      ...tenantColumn(),
      sequence_name: text("sequence_name").notNull(),
      current_value: bigint("current_value", { mode: "number" }).notNull().default(0),
    },
    (t) => [primaryKey({ columns: [t.iq_tenant_id, t.sequence_name] })],
  );
}

const tableCache = new Map<string, SequenceCountersTable>();

function sequenceCountersTable(schema: string): SequenceCountersTable {
  let table = tableCache.get(schema);
  if (!table) {
    table = buildSequenceCountersTable(schema);
    tableCache.set(schema, table);
  }
  return table;
}

export async function nextSequenceValue(
  db: DbInstance,
  tenantId: string,
  sequenceName: string,
  startsAt: number,
  schema: string,
): Promise<number> {
  const sequenceCounters = sequenceCountersTable(schema);
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
