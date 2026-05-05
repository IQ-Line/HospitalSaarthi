import { eq, and, sql, type SQL } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import type { UserRepo } from "../ports.js";
import type {
  User,
  CreateUserData,
  UpdateUserData,
  UserFilters,
} from "../domain/user.types.js";
import { users } from "../schema/tables.js";

export class DrizzleUserRepo implements UserRepo {
  constructor(private readonly db: DbInstance) {}

  async findAll(
    tenantId: string,
    filters?: UserFilters,
  ): Promise<{ data: User[]; total: number }> {
    const conditions: SQL[] = [eq(users.iq_tenant_id, tenantId)];

    if (filters?.status) {
      conditions.push(eq(users.status, filters.status));
    }

    const where = and(...conditions)!;
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .limit(limit)
        .offset(offset) as unknown as Promise<User[]>,
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(where),
    ]);

    return { data, total: countResult[0]?.count ?? 0 };
  }

  async findById(tenantId: string, id: string): Promise<User | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, id)))
      .limit(1);

    return rows[0] as User | undefined;
  }

  async findByUsername(tenantId: string, username: string): Promise<User | undefined> {
    // Username lives on ba_users; this is a placeholder for the join query
    // that will be implemented when better-auth integration lands.
    // For now, search by employee_id as a stand-in.
    void tenantId;
    void username;
    return undefined;
  }

  async create(data: CreateUserData): Promise<User> {
    const rows = await this.db
      .insert(users)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        auth_user_id: data.auth_user_id ?? null,
        kind: data.kind ?? "user",
        org_id: data.org_id ?? null,
        employee_id: data.employee_id ?? null,
        full_name: data.full_name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        status: data.status ?? "active",
        recovery_tier: data.recovery_tier ?? "admin_only",
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();

    return rows[0] as User;
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdateUserData,
  ): Promise<User | undefined> {
    const rows = await this.db
      .update(users)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, id)))
      .returning();

    return rows[0] as User | undefined;
  }

  async deactivate(
    tenantId: string,
    id: string,
    deactivatedBy: string,
  ): Promise<User | undefined> {
    const rows = await this.db
      .update(users)
      .set({
        status: "inactive",
        updated_by: deactivatedBy,
        updated_at: new Date(),
      })
      .where(and(eq(users.iq_tenant_id, tenantId), eq(users.id, id)))
      .returning();

    return rows[0] as User | undefined;
  }
}
