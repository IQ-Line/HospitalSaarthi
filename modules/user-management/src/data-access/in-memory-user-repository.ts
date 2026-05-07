import { randomUUID } from "node:crypto";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserRepository,
  UserStatus,
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
};

function rowKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
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
      status: row.status,
    };
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
    };
    this.users.set(key, row);
    return this.toUser(row);
  }

  async getUserById(tenantId: string, userId: string): Promise<User | null> {
    const row = this.users.get(rowKey(tenantId, userId));
    return row ? this.toUser(row) : null;
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
