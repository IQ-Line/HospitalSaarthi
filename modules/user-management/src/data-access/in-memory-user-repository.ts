import { randomUUID } from "node:crypto";
import type { CreateUserInput, UpdateUserInput, User, UserRepository } from "../ports/index.js";

type StoredUser = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

function rowKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
}

/** In-memory {@link UserRepository} using a Map keyed by `tenantId:userId`. */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, StoredUser>();

  async createUser(tenantId: string, input: CreateUserInput): Promise<User> {
    const id = randomUUID();
    const key = rowKey(tenantId, id);
    this.users.set(key, {
      id,
      full_name: input.full_name,
      email: input.email ?? null,
      phone: input.phone ?? null,
    });
    return { id, full_name: input.full_name };
  }

  async getUserById(tenantId: string, userId: string): Promise<User | null> {
    const row = this.users.get(rowKey(tenantId, userId));
    return row ? { id: row.id, full_name: row.full_name } : null;
  }

  async updateUser(tenantId: string, userId: string, input: UpdateUserInput): Promise<User | null> {
    const key = rowKey(tenantId, userId);
    const row = this.users.get(key);
    if (!row) {
      return null;
    }

    if (input.full_name === undefined && input.email === undefined && input.phone === undefined) {
      return { id: row.id, full_name: row.full_name };
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
    this.users.set(key, next);
    return { id: next.id, full_name: next.full_name };
  }
}
