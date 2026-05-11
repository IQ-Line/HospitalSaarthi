import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { createUser } from "../use-cases/create-user.js";
import { updateUser } from "../use-cases/update-user.js";
import {
  USER_MANAGEMENT_EVENT_USER_CREATED,
  USER_MANAGEMENT_EVENT_USER_UPDATED,
} from "./constants.js";
import { USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION } from "./contracts.js";

const eventCtx = {
  tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
  correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
};

class CapturingEventBus implements EventBus {
  readonly publishedEvents: DomainEvent[] = [];

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
    return { async unsubscribe(): Promise<void> {} };
  }
}

function assertUserEventPayloadCore(payload: unknown): void {
  expect(payload).toEqual(expect.any(Object));
  expect(payload).not.toBeNull();
  const p = payload as Record<string, unknown>;
  expect(p).toHaveProperty("id");
  expect(p).toHaveProperty("full_name");
  expect(p).toHaveProperty("status");
  expect(p.event_contract_version).toBe(USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION);
}

describe("user lifecycle event payloads", () => {
  it("create-user emits event containing required fields and contract version", async () => {
    const userRepository = new InMemoryUserRepository();
    const eventBus = new CapturingEventBus();

    await createUser(
      { userRepository, eventBus },
      eventCtx,
      {
        full_name: "Created User",
        email: "created@example.com",
        phone: "111",
        username: "created",
        org_id: "f47ac10b-58cc-4372-a567-0e02b2c3d470",
      },
    );

    expect(eventBus.publishedEvents).toHaveLength(1);
    const event = eventBus.publishedEvents[0]!;
    expect(event.event_type).toBe(USER_MANAGEMENT_EVENT_USER_CREATED);
    expect(event.event_contract_version).toBe(USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION);
    assertUserEventPayloadCore(event.payload);
    const p = event.payload as Record<string, unknown>;
    expect(p.status).toBe("active");
    expect(p).toHaveProperty("auth_user_id");
    expect(p.auth_user_id).toBeNull();
    expect(p).toHaveProperty("org_id");
    expect(p).toHaveProperty("username");
    expect(p).toHaveProperty("email");
    expect(p).toHaveProperty("phone");
  });

  it("update-user emits event containing required fields and contract version", async () => {
    const userRepository = new InMemoryUserRepository();
    const eventBus = new CapturingEventBus();
    const created = await userRepository.createUser(eventCtx.tenantId, {
      full_name: "Before",
      email: null,
      phone: null,
      username: null,
      org_id: null,
    });

    await updateUser(
      { userRepository, eventBus },
      eventCtx,
      created.id,
      {
        full_name: "After",
        email: "after@example.com",
        auth_user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d471",
        org_id: "f47ac10b-58cc-4372-a567-0e02b2c3d472",
        username: "afteruser",
        status: "suspended",
        phone: "222",
      },
    );

    const updatedEvent = eventBus.publishedEvents.find(
      (e) => e.event_type === USER_MANAGEMENT_EVENT_USER_UPDATED,
    );
    expect(updatedEvent).toBeDefined();
    expect(updatedEvent!.event_contract_version).toBe(USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION);
    assertUserEventPayloadCore(updatedEvent!.payload);
    const p = updatedEvent!.payload as Record<string, unknown>;
    expect(p.id).toBe(created.id);
    expect(p.auth_user_id).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d471");
    expect(p.org_id).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d472");
    expect(p.username).toBe("afteruser");
    expect(p.status).toBe("suspended");
  });
});
