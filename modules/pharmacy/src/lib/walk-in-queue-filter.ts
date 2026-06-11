import { ilike, or, sql } from "drizzle-orm";
import { dispenseRecords, walkInPatients } from "../schema/tables.js";

export function buildWalkInQueueSearchCondition(query: string) {
  const pattern = `%${query}%`;
  const compactQuery = query.replace(/-/g, "");
  const uuidPrefixPattern =
    query.length >= 8 && /^[0-9a-f-]+$/.test(query) ? `${compactQuery}%` : null;

  const fields = [
    ilike(walkInPatients.first_name, pattern),
    ilike(walkInPatients.last_name, pattern),
    ilike(
      sql`concat(${walkInPatients.first_name}, ' ', coalesce(${walkInPatients.last_name}, ''))`,
      pattern,
    ),
    ilike(walkInPatients.phone, pattern),
    ilike(sql`${dispenseRecords.id}::text`, pattern),
    ilike(sql`${walkInPatients.id}::text`, pattern),
  ];

  if (uuidPrefixPattern) {
    fields.push(
      ilike(sql`replace(${dispenseRecords.id}::text, '-', '')`, uuidPrefixPattern),
      ilike(sql`replace(${walkInPatients.id}::text, '-', '')`, uuidPrefixPattern),
    );
  }

  return or(...fields)!;
}
