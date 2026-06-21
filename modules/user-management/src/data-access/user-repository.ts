import type { DbInstance } from "@hims/ts-sdk-db";
import { DuplicateUsernameError, UnexpectedPersistenceError } from "../domain/errors.js";
import { isPostgresUniqueViolation } from "./postgres-errors.js";
import type { UserReadListResourceAbac } from "../domain/user-read-list-resource-filter.js";
import { clampClearanceTierRequired } from "../domain/um-clearance-tier.js";
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type {
  CreateUserInput,
  ListUsersOptions,
  UpdateUserInput,
  User,
  UserApiKeyRecord,
  UserRepository,
  UserStatus,
  UserWithTenant,
} from "../ports/index.js";
import { roles, user_roles, users } from "../schema/tables.js";

function drizzleUserReadResourceAbacWhere(f: UserReadListResourceAbac): SQL {
  const tier = f.effectiveTier;
  const hasC = f.hasClearances;
  const pDept = f.principalDepartment;

  const clearance = or(
    lte(users.clearance_tier_required, 0),
    and(gt(users.clearance_tier_required, 0), hasC ? lte(users.clearance_tier_required, tier) : sql`false`),
  );

  const department =
    pDept !== null && pDept.length > 0
      ? or(isNull(users.department), eq(users.department, ""), eq(users.department, pDept))
      : sql`true`;

  return and(department, clearance) as SQL;
}

function rowToUser(row: {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  auth_user_id: string | null;
  status: string;
  username: string | null;
  recovery_tier: string;
  org_id: string | null;
  department: string | null;
  clearance_tier_required: number;
  role_display_names?: string | string[];
}): User {
  let roleNames: string[] | undefined;
  if (row.role_display_names !== undefined) {
    if (Array.isArray(row.role_display_names)) {
      roleNames = row.role_display_names.length > 0 ? row.role_display_names : undefined;
    } else if (typeof row.role_display_names === "string") {
      const parsed = parsePgTextArray(row.role_display_names);
      roleNames = parsed.length > 0 ? parsed : undefined;
    }
  }
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    auth_user_id: row.auth_user_id,
    username: row.username,
    recovery_tier: row.recovery_tier,
    org_id: row.org_id,
    department: row.department,
    clearance_tier_required: row.clearance_tier_required,
    status: row.status as UserStatus,
    ...(roleNames ? { role_display_names: roleNames } : {}),
  };
}

function parsePgTextArray(raw: string): string[] {
  if (raw === "{}" || raw === "") return [];
  const inner = raw.startsWith("{") && raw.endsWith("}") ? raw.slice(1, -1) : raw;
  if (inner === "") return [];
  return inner.split(",").map((s) => {
    const trimmed = s.trim();
    return trimmed.startsWith('"') && trimmed.endsWith('"')
      ? trimmed.slice(1, -1).replace(/\\"/g, '"')
      : trimmed;
  });
}

const userColumns = {
  id: users.id,
  full_name: users.full_name,
  email: users.email,
  phone: users.phone,
  auth_user_id: users.auth_user_id,
  status: users.status,
  username: users.username,
  recovery_tier: users.recovery_tier,
  org_id: users.org_id,
  department: users.department,
  clearance_tier_required: users.clearance_tier_required,
} as const;

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DbInstance) {}

  async createUser(tenantId: string, input: CreateUserInput): Promise<User> {
    try {
      const [row] = await this.db
        .insert(users)
        .values({
          iq_tenant_id: tenantId,
          full_name: input.full_name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          username: input.username ?? null,
          org_id: input.org_id ?? null,
          department: input.department ?? null,
          clearance_tier_required:
            input.clearance_tier_required !== undefined
              ? clampClearanceTierRequired(input.clearance_tier_required)
              : 0,
        })
        .returning(userColumns);

      if (!row) {
        throw new UnexpectedPersistenceError();
      }
      return rowToUser(row);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new DuplicateUsernameError(input.username ?? undefined);
      }
      throw error;
    }
  }

  async getUserById(tenantId: string, userId: string): Promise<User | null> {
    const [row] = await this.db
      .select(userColumns)
      .from(users)
      .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, userId)))
      .limit(1);

    return row ? rowToUser(row) : null;
  }

  async findUserByGlobalId(identityUserId: string): Promise<UserWithTenant | null> {
    const [row] = await this.db
      .select({
        id: users.id,
        full_name: users.full_name,
        email: users.email,
        phone: users.phone,
        auth_user_id: users.auth_user_id,
        status: users.status,
        username: users.username,
        recovery_tier: users.recovery_tier,
        org_id: users.org_id,
        department: users.department,
        clearance_tier_required: users.clearance_tier_required,
        iq_tenant_id: users.iq_tenant_id,
      })
      .from(users)
      .where(or(eq(users.id, identityUserId), eq(users.auth_user_id, identityUserId)))
      .limit(1);

    if (!row) return null;
    const { iq_tenant_id, ...u } = row;
    return { ...rowToUser(u), iq_tenant_id };
  }

  async listUsers(tenantId: string, options?: ListUsersOptions): Promise<User[]> {
    const conditions: SQL[] = [eq(users.iq_tenant_id, tenantId)];

    if (options?.userReadResourceAbac !== undefined) {
      conditions.push(drizzleUserReadResourceAbacWhere(options.userReadResourceAbac));
    }
    if (options?.department !== undefined) {
      conditions.push(eq(users.department, options.department));
    }

    const rows = await this.db
      .select({
        ...userColumns,
        role_display_names:
          sql<string>`coalesce(array_agg(distinct ${roles.display_name}) filter (where ${roles.display_name} is not null), '{}')`.as(
            "role_display_names",
          ),
      })
      .from(users)
      .leftJoin(
        user_roles,
        and(
          eq(user_roles.iq_tenant_id, users.iq_tenant_id),
          eq(user_roles.user_id, users.id),
        ),
      )
      .leftJoin(
        roles,
        and(
          eq(roles.iq_tenant_id, user_roles.iq_tenant_id),
          eq(roles.id, user_roles.role_id),
        ),
      )
      .where(and(...conditions))
      .groupBy(
        users.iq_tenant_id,
        users.id,
      );

    return rows.map((row) => rowToUser(row));
  }

  async updateUser(tenantId: string, userId: string, input: UpdateUserInput): Promise<User | null> {
    const patch: Partial<{
      full_name: string;
      email: string | null;
      phone: string | null;
      username: string | null;
      org_id: string | null;
      department: string | null;
      clearance_tier_required: number;
      status: UserStatus;
      auth_user_id: string | null;
      updated_at: Date;
    }> = {};

    if (input.full_name !== undefined) {
      patch.full_name = input.full_name;
    }
    if (input.email !== undefined) {
      patch.email = input.email;
    }
    if (input.phone !== undefined) {
      patch.phone = input.phone;
    }
    if (input.username !== undefined) {
      patch.username = input.username;
    }
    if (input.org_id !== undefined) {
      patch.org_id = input.org_id;
    }
    if (input.department !== undefined) {
      patch.department = input.department;
    }
    if (input.clearance_tier_required !== undefined) {
      patch.clearance_tier_required = clampClearanceTierRequired(input.clearance_tier_required);
    }
    if (input.status !== undefined) {
      patch.status = input.status;
    }
    if (input.auth_user_id !== undefined) {
      patch.auth_user_id = input.auth_user_id;
    }

    if (Object.keys(patch).length === 0) {
      return this.getUserById(tenantId, userId);
    }

    patch.updated_at = new Date();

    const [row] = await this.db
      .update(users)
      .set(patch)
      .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, userId)))
      .returning(userColumns);

    return row ? rowToUser(row) : null;
  }

  async findActiveUserByApiKeyPrefix(prefix: string): Promise<UserApiKeyRecord | null> {
    const [row] = await this.db
      .select({
        id: users.id,
        full_name: users.full_name,
        email: users.email,
        phone: users.phone,
        auth_user_id: users.auth_user_id,
        status: users.status,
        username: users.username,
        recovery_tier: users.recovery_tier,
        org_id: users.org_id,
        department: users.department,
        clearance_tier_required: users.clearance_tier_required,
        iq_tenant_id: users.iq_tenant_id,
        api_key_hash: users.api_key_hash,
      })
      .from(users)
      .where(and(eq(users.api_key_prefix, prefix), eq(users.status, "active")))
      .limit(1);

    if (!row?.api_key_hash) return null;
    const { iq_tenant_id, api_key_hash, ...u } = row;
    return { ...rowToUser(u), iq_tenant_id, api_key_hash };
  }
}
