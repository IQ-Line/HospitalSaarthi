export { tenantColumn, auditColumns, allStandardColumns } from "./columns.js";
export {
  withTenant,
  tenantFilter,
  tenantAnd,
} from "./tenant-scope.js";
export { createDb, type DbInstance } from "./connection.js";

/** Re-export Drizzle so consumers (e.g. EMPI) share one `drizzle-orm` instance — avoids duplicate versions / `instanceof` bugs (pnpm). */
export { and, eq, ilike, sql } from "drizzle-orm";
export {
  bigint,
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
