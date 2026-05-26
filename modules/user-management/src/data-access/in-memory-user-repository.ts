import { randomUUID } from "node:crypto";
import { userMatchesReadListResourceAbac } from "../domain/user-read-list-resource-filter.js";
import { clampClearanceTierRequired } from "../domain/um-clearance-tier.js";
import type {
  CreateUserInput,
  ListUsersOptions,
  UpdateUserInput,
  User,
  UserRepository,
  UserStatus,
  UserWithTenant,
} from "../ports/index.js";

type StoredUser = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  auth_user_id: string | null;
  status: UserStatus;
  username: string | null;
  org_id: string | null;
  department: string | null;
  clearance_tier_required: number;
};

function rowKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
}

function tenantFromRowKey(key: string): string {
  const i = key.indexOf(":");
  return i === -1 ? key : key.slice(0, i);
}

/** In-memory {@link UserRepository} using a Map keyed by `tenantId:userId`. */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, StoredUser>();

  private toUser(row: StoredUser): User {
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
      status: row.status,
    };
  }

  /**
   * Bootstrap helper (tests / dev issuance): persist a user with a deterministic id so JWT `sub`
   * resolves before role assignment workflows exist.
   */
  insertUserWithId(tenantId: string, userId: string, input: CreateUserInput): User {
    const key = rowKey(tenantId, userId);
    const row: StoredUser = {
      id: userId,
      full_name: input.full_name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      auth_user_id: null,
      status: "active",
      username: input.username ?? null,
      org_id: input.org_id ?? null,
      department: input.department ?? null,
      clearance_tier_required:
        input.clearance_tier_required !== undefined
          ? clampClearanceTierRequired(input.clearance_tier_required)
          : 0,
    };
    this.users.set(key, row);
    return this.toUser(row);
  }

  async createUser(tenantId: string, input: CreateUserInput): Promise<User> {
    const id = randomUUID();
    const key = rowKey(tenantId, id);
    const row: StoredUser = {
      id,
      full_name: input.full_name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      auth_user_id: null,
      status: "active",
      username: input.username ?? null,
      org_id: input.org_id ?? null,
      department: input.department ?? null,
      clearance_tier_required:
        input.clearance_tier_required !== undefined
          ? clampClearanceTierRequired(input.clearance_tier_required)
          : 0,
    };
    this.users.set(key, row);
    return this.toUser(row);
  }

  async getUserById(tenantId: string, userId: string): Promise<User | null> {
    const row = this.users.get(rowKey(tenantId, userId));
    return row ? this.toUser(row) : null;
  }

  async findUserByGlobalId(identityUserId: string): Promise<UserWithTenant | null> {
    for (const [key, row] of this.users) {
      if (row.id === identityUserId || row.auth_user_id === identityUserId) {
        return { ...this.toUser(row), iq_tenant_id: tenantFromRowKey(key) };
      }
    }
    return null;
  }

  async listUsers(tenantId: string, options?: ListUsersOptions): Promise<User[]> {
    const prefix = `${tenantId}:`;
    let out: User[] = [];
    for (const [key, row] of this.users) {
      if (key.startsWith(prefix)) {
        out.push(this.toUser(row));
      }
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    const abac = options?.userReadResourceAbac;
    if (abac !== undefined) {
      out = out.filter((u) => userMatchesReadListResourceAbac(u, abac));
    }
    if (options?.department !== undefined) {
      out = out.filter((u) => u.department === options.department);
    }
    return out;
  }

  async updateUser(tenantId: string, userId: string, input: UpdateUserInput): Promise<User | null> {
    const key = rowKey(tenantId, userId);
    const row = this.users.get(key);
    if (!row) {
      return null;
    }

    if (
      input.full_name === undefined &&
      input.email === undefined &&
      input.phone === undefined &&
      input.username === undefined &&
      input.org_id === undefined &&
      input.department === undefined &&
      input.clearance_tier_required === undefined &&
      input.status === undefined &&
      input.auth_user_id === undefined
    ) {
      return this.toUser(row);
    }

    const next: StoredUser = { ...row };
    if (input.full_name !== undefined) {
      next.full_name = input.full_name;
    }
    if (input.email !== undefined) {
      next.email = input.email;
    }
    if (input.phone !== undefined) {
      next.phone = input.phone;
    }
    if (input.username !== undefined) {
      next.username = input.username;
    }
    if (input.org_id !== undefined) {
      next.org_id = input.org_id;
    }
    if (input.department !== undefined) {
      next.department = input.department;
    }
    if (input.clearance_tier_required !== undefined) {
      next.clearance_tier_required = clampClearanceTierRequired(input.clearance_tier_required);
    }
    if (input.status !== undefined) {
      next.status = input.status;
    }
    if (input.auth_user_id !== undefined) {
      next.auth_user_id = input.auth_user_id;
    }
    this.users.set(key, next);
    return this.toUser(next);
  }
}
