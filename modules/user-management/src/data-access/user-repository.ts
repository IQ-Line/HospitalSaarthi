import type { DbInstance } from "@hims/ts-sdk-db";
import { UnexpectedPersistenceError } from "../domain/errors.js";
import type { UserReadListResourceAbac } from "../domain/user-read-list-resource-filter.js";
import { clampClearanceTierRequired } from "../domain/um-clearance-tier.js";
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type {
  CreateUserInput,
  ListUsersOptions,
  UpdateUserInput,
  User,
  UserRepository,
  UserStatus,
  UserWithTenant,
} from "../ports/index.js";
import { users } from "../schema/tables.js";

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
  org_id: string | null;
  department: string | null;
  clearance_tier_required: number;
}): User {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    auth_user_id: row.auth_user_id,
    username: row.username,
    org_id: row.org_id,
    department: row.department,
    clearance_tier_required: row.clearance_tier_required,
    status: row.status as UserStatus,
  };
}

const userColumns = {
  id: users.id,
  full_name: users.full_name,
  email: users.email,
  phone: users.phone,
  auth_user_id: users.auth_user_id,
  status: users.status,
  username: users.username,
  org_id: users.org_id,
  department: users.department,
  clearance_tier_required: users.clearance_tier_required,
} as const;

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DbInstance) {}

  async createUser(tenantId: string, input: CreateUserInput): Promise<User> {
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
  }

  async getUserById(tenantId: string, userId: string): Promise<User | null> {
    const [row] = await this.db
      .select(userColumns)
      .from(users)
      .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, userId)))
      .limit(1);

    return row ? rowToUser(row) : null;
  }

  async findUserByGlobalId(userId: string): Promise<UserWithTenant | null> {
    const [row] = await this.db
      .select({
        id: users.id,
        full_name: users.full_name,
        email: users.email,
        phone: users.phone,
        auth_user_id: users.auth_user_id,
        status: users.status,
        username: users.username,
        org_id: users.org_id,
        department: users.department,
        clearance_tier_required: users.clearance_tier_required,
        iq_tenant_id: users.iq_tenant_id,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) return null;
    const { iq_tenant_id, ...u } = row;
    return { ...rowToUser(u), iq_tenant_id };
  }

  async listUsers(tenantId: string, options?: ListUsersOptions): Promise<User[]> {
    const tenantEq = eq(users.iq_tenant_id, tenantId);
    const where =
      options?.userReadResourceAbac !== undefined
        ? and(tenantEq, drizzleUserReadResourceAbacWhere(options.userReadResourceAbac))
        : tenantEq;

    const rows = await this.db.select(userColumns).from(users).where(where);

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
}
