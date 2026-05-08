import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { USER_MANAGEMENT_EVENT_USER_UPDATED } from "../events/constants.js";
import { updateUser } from "./update-user.js";

class TestEventBus implements EventBus {
  readonly publishedEvents: DomainEvent[] = [];

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
    return {
      async unsubscribe(): Promise<void> {},
    };
  }
}

describe("updateUser", () => {
  it("publishes user.updated event on successful update", async () => {
    const userRepository = new InMemoryUserRepository();
    const eventBus = new TestEventBus();
    const created = await userRepository.createUser("tenant-a", {
      full_name: "Jane Doe",
      email: "jane@example.com",
      phone: "1234567890",
    });

    const updated = await updateUser(
      { userRepository, eventBus },
      {
        tenantId: "tenant-a",
        actorId: "actor-a",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
      },
      created.id,
      { full_name: "Jane Smith" },
    );

    expect(updated).not.toBeNull();
    expect(updated?.full_name).toBe("Jane Smith");
    expect(eventBus.publishedEvents).toHaveLength(1);
    expect(eventBus.publishedEvents[0]?.event_type).toBe(USER_MANAGEMENT_EVENT_USER_UPDATED);
  });

  it("returns null and publishes nothing when repository returns null", async () => {
    const userRepository = new InMemoryUserRepository();
    const eventBus = new TestEventBus();

    const updated = await updateUser(
      { userRepository, eventBus },
      {
        tenantId: "tenant-a",
        actorId: "actor-a",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      },
      "7b0f4369-2a01-4ad0-a13f-9d17fdca9e96",
      { full_name: "Missing User" },
    );

    expect(updated).toBeNull();
    expect(eventBus.publishedEvents).toHaveLength(0);
  });

  it("publishes enriched payload fields on update", async () => {
    const userRepository = new InMemoryUserRepository();
    const eventBus = new TestEventBus();
    const created = await userRepository.createUser("tenant-a", {
      full_name: "John Doe",
      email: null,
      phone: null,
      username: null,
      org_id: null,
    });

    await updateUser(
      { userRepository, eventBus },
      {
        tenantId: "tenant-a",
        actorId: "actor-a",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
      },
      created.id,
      {
        email: "john@example.com",
        phone: "9999999999",
        username: "john",
        org_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        auth_user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d478",
        status: "suspended",
      },
    );

    const event = eventBus.publishedEvents[0];
    expect(event?.payload).toEqual({
      id: created.id,
      full_name: "John Doe",
      email: "john@example.com",
      phone: "9999999999",
      status: "suspended",
      username: "john",
      org_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      auth_user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d478",
    });
  });

  it("persists status updates correctly", async () => {
    const userRepository = new InMemoryUserRepository();
    const eventBus = new TestEventBus();
    const created = await userRepository.createUser("tenant-a", {
      full_name: "Status User",
    });

    const updated = await updateUser(
      { userRepository, eventBus },
      {
        tenantId: "tenant-a",
        actorId: "actor-a",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d484",
      },
      created.id,
      { status: "inactive" },
    );

    const reloaded = await userRepository.getUserById("tenant-a", created.id);
    expect(updated?.status).toBe("inactive");
    expect(reloaded?.status).toBe("inactive");
    expect(eventBus.publishedEvents[0]?.payload.status).toBe("inactive");
  });
});
