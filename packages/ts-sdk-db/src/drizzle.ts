/** Re-exports for consumers that share Drizzle query builders / pg-core (single resolution path). */
export { eq, and, ilike, sql, type SQL } from "drizzle-orm";
export {
  pgSchema,
  uuid,
  text,
  jsonb,
  uniqueIndex,
  index,
  check,
  bigint,
  boolean,
  date,
  numeric,
  primaryKey,
  smallint,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
