import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it, vi } from "vitest";
import type {
  CreateUserInput,
  ListUsersOptions,
  UpdateUserInput,
  User,
  UserRepository,
  UserWithTenant,
} from "../../../src/ports/index.js";
import { USER_MANAGEMENT_EVENT_USER_UPDATED } from "../../../src/events/constants.js";
import { activateUser } from "../../../src/use-cases/activate-user.js";

class MemUserRepo implements UserRepository {
  constructor(private user: User | null) {}
  async createUser(_tenantId: string, _input: CreateUserInput): Promise<User> {
    throw new Error("not implemented");
  }
  async getUserById(): Promise<User | null> {
    return this.user;
  }
  async findUserByGlobalId(): Promise<UserWithTenant | null> {
    return null;
  }
  async listUsers(_tenantId: string, _options?: ListUsersOptions): Promise<User[]> {
    return [];
  }
  async updateUser(_tenantId: string, _userId: string, input: UpdateUserInput): Promise<User | null> {
    if (this.user === null) return null;
    this.user = { ...this.user, ...input } as User;
    return this.user;
  }
}

describe("activateUser", () => {
  it("returns null when user is missing", async () => {
    const eventBus: EventBus = {
      async connect() {},
      async disconnect() {},
      async publish() {},
      async subscribe(): Promise<Subscription> {
        return { async unsubscribe() {} };
      },
    };
    const publish = vi.spyOn(eventBus, "publish");
    const out = await activateUser(
      { userRepository: new MemUserRepo(null), eventBus },
      {
        tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      },
      "missing",
    );
    expect(out).toBeNull();
    expect(publish).not.toHaveBeenCalled();
  });

  it("is idempotent when already active (no new events)", async () => {
    const active: User = {
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
      full_name: "X",
      status: "active",
    };
    const eventBus: EventBus = {
      async connect() {},
      async disconnect() {},
      async publish() {},
      async subscribe(): Promise<Subscription> {
        return { async unsubscribe() {} };
      },
    };
    const publish = vi.spyOn(eventBus, "publish");
    const out = await activateUser(
      { userRepository: new MemUserRepo(active), eventBus },
      {
        tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      },
      active.id,
    );
    expect(out?.status).toBe("active");
    expect(publish).not.toHaveBeenCalled();
  });

  it("activates inactive user and publishes updated", async () => {
    const inactive: User = {
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      full_name: "Y",
      status: "inactive",
    };
    const events: string[] = [];
    const eventBus: EventBus = {
      async connect() {},
      async disconnect() {},
      async publish(event: DomainEvent): Promise<void> {
        events.push(event.event_type);
      },
      async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
        return { async unsubscribe() {} };
      },
    };
    const out = await activateUser(
      { userRepository: new MemUserRepo({ ...inactive }), eventBus },
      {
        tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      },
      inactive.id,
    );
    expect(out?.status).toBe("active");
    expect(events).toContain(USER_MANAGEMENT_EVENT_USER_UPDATED);
  });
});
