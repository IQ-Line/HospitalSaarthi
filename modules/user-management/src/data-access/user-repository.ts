import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "drizzle-orm";
import type { CreateUserInput, UpdateUserInput, User, UserRepository } from "../ports/index.js";
import { role_assignments, users } from "../schema/tables.js";

function rowToUser(row: { id: string; full_name: string }): User {
  return { id: row.id, full_name: row.full_name };
}

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
      })
      .returning({ id: users.id, full_name: users.full_name });

    if (!row) {
      throw new Error("createUser: insert returned no row");
    }
    return rowToUser(row);
  }

  async getUserById(tenantId: string, userId: string): Promise<User | null> {
    const [row] = await this.db
      .select({ id: users.id, full_name: users.full_name })
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

    if (Object.keys(patch).length === 0) {
      return this.getUserById(tenantId, userId);
    }

    patch.updated_at = new Date();

    const [row] = await this.db
      .update(users)
      .set(patch)
      .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, userId)))
      .returning({ id: users.id, full_name: users.full_name });

    return row ? rowToUser(row) : null;
  }
}
