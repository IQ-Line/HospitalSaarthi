import type { DbInstance } from "@hims/ts-sdk-db";
import { UnexpectedPersistenceError } from "../domain/errors.js";
import { and, eq } from "drizzle-orm";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserRepository,
  UserStatus,
} from "../ports/index.js";
import { users } from "../schema/tables.js";

function rowToUser(row: {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  auth_user_id: string | null;
  status: string;
  username: string | null;
  org_id: string | null;
}): User {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    auth_user_id: row.auth_user_id,
    username: row.username,
    org_id: row.org_id,
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

  async updateUser(tenantId: string, userId: string, input: UpdateUserInput): Promise<User | null> {
    const patch: Partial<{
      full_name: string;
      email: string | null;
      phone: string | null;
      username: string | null;
      org_id: string | null;
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
