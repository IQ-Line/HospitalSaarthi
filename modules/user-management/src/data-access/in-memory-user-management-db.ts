import { randomUUID } from "node:crypto";
import { Column, is, Param, SQL, StringChunk } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import { role_assignments, users } from "../schema/tables.js";
import type { UserManagementDb } from "./user-repository.js";

type UserRow = {
  iq_tenant_id: string;
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
};

type RoleRow = {
  iq_tenant_id: string;
  id: string;
  user_id: string;
  role_id: string;
  created_at: Date;
};

function flattenSql(sql: SQL): unknown[] {
  const out: unknown[] = [];
  const visit = (chunk: unknown) => {
    if (is(chunk, SQL)) {
      for (const c of chunk.queryChunks) visit(c);
      return;
    }
    if (Array.isArray(chunk)) {
      for (const c of chunk) visit(c);
      return;
    }
    out.push(chunk);
  };
  for (const c of sql.queryChunks) visit(c);
  return out;
}

function collectEqColumnParams(where: SQL | undefined): Map<Column, unknown> {
  const result = new Map<Column, unknown>();
  if (!where) return result;
  const flat = flattenSql(where);
  for (let i = 0; i < flat.length; i++) {
    const col = flat[i];
    const sep = flat[i + 1];
    const param = flat[i + 2];
    if (
      is(col, Column) &&
      is(sep, StringChunk) &&
      sep.value.join("") === " = " &&
      is(param, Param)
    ) {
      result.set(col, param.encoder.mapToDriverValue(param.value));
      i += 2;
    }
  }
  return result;
}

function projectRow(row: Record<string, unknown>, map: Record<string, AnyColumn>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(map)) {
    const col = map[key]!;
    out[key] = row[col.name];
  }
  return out;
}

function rowMatchesBindings(row: Record<string, unknown>, bindings: Map<Column, unknown>): boolean {
  for (const [col, val] of bindings) {
    if (row[col.name] !== val) return false;
  }
  return true;
}

function uniqueViolation(): Error & { code: string } {
  return Object.assign(new Error("unique violation"), { code: "23505" });
}

/**
 * Minimal Drizzle-shaped in-memory DB for local route testing (no Postgres).
 */
export function createInMemoryUserManagementDb(): UserManagementDb {
  const userRows: UserRow[] = [];
  const roleRows: RoleRow[] = [];

  const db = {
    insert(table: typeof users | typeof role_assignments) {
      return {
        values(row: Record<string, unknown>) {
          return {
            async returning(map: Record<string, AnyColumn>) {
              if (table === users) {
                const now = new Date();
                const rec: UserRow = {
                  iq_tenant_id: row.iq_tenant_id as string,
                  id: (row.id as string | undefined) ?? randomUUID(),
                  full_name: row.full_name as string,
                  email: (row.email as string | null | undefined) ?? null,
                  phone: (row.phone as string | null | undefined) ?? null,
                  created_at: now,
                  updated_at: now,
                };
                userRows.push(rec);
                return [projectRow(rec, map)];
              }
              if (table === role_assignments) {
                const tenantId = row.iq_tenant_id as string;
                const userId = row.user_id as string;
                const roleId = row.role_id as string;
                const dup = roleRows.some(
                  (r) => r.iq_tenant_id === tenantId && r.user_id === userId && r.role_id === roleId,
                );
                if (dup) throw uniqueViolation();
                const now = new Date();
                const rec: RoleRow = {
                  iq_tenant_id: tenantId,
                  id: (row.id as string | undefined) ?? randomUUID(),
                  user_id: userId,
                  role_id: roleId,
                  created_at: now,
                };
                roleRows.push(rec);
                return [projectRow(rec, map)];
              }
              throw new Error("in-memory db: unsupported insert table");
            },
          };
        },
      };
    },

    select(map: Record<string, AnyColumn>) {
      return {
        from(table: typeof users | typeof role_assignments) {
          return {
            where(whereSql: SQL) {
              return {
                async limit(n: number) {
                  const bindings = collectEqColumnParams(whereSql);
                  if (table === users) {
                    const matched = userRows.filter((r) => rowMatchesBindings(r, bindings));
                    return matched.slice(0, n).map((r) => projectRow(r, map));
                  }
                  if (table === role_assignments) {
                    const matched = roleRows.filter((r) => rowMatchesBindings(r, bindings));
                    return matched.slice(0, n).map((r) => projectRow(r, map));
                  }
                  return [];
                },
              };
            },
          };
        },
      };
    },

    update(table: typeof users) {
      return {
        set(patch: Record<string, unknown>) {
          return {
            where(whereSql: SQL) {
              return {
                async returning(map: Record<string, AnyColumn>) {
                  if (table !== users) throw new Error("in-memory db: unsupported update table");
                  const bindings = collectEqColumnParams(whereSql);
                  const idx = userRows.findIndex((r) => rowMatchesBindings(r, bindings));
                  if (idx === -1) return [];
                  const rec = userRows[idx]!;
                  if (patch.full_name !== undefined) rec.full_name = patch.full_name as string;
                  if (patch.email !== undefined) rec.email = patch.email as string | null;
                  if (patch.phone !== undefined) rec.phone = patch.phone as string | null;
                  rec.updated_at = new Date();
                  return [projectRow(rec, map)];
                },
              };
            },
          };
        },
      };
    },
  };

  return db as unknown as UserManagementDb;
}
