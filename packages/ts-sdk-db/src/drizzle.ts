/** Re-exports for consumers that share Drizzle query builders / pg-core (single resolution path). */
export { eq, and, sql, type SQL } from "drizzle-orm";
export {
  pgSchema,
  uuid,
  text,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
