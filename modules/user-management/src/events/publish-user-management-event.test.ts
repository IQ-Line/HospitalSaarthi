import {
  validateEnvelope,
  type DomainEvent,
  type EventBus,
  type EventHandler,
  type Subscription,
} from "@hims/ts-sdk-events";
import { describe, expect, it } from "vitest";
import {
  USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
  USER_MANAGEMENT_EVENT_TYPES,
  USER_MANAGEMENT_EVENT_USER_CREATED,
} from "./constants.js";
import { USER_MANAGEMENT_EVENT_CONTRACTS } from "./contracts.js";
import {
  UserManagementEventValidationError,
  publishUserManagementEvent,
} from "./publish-user-management-event.js";

class TestEventBus implements EventBus {
  readonly publishedEvents: DomainEvent[] = [];

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
    return { async unsubscribe(): Promise<void> {} };
  }

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }
}

describe("publishUserManagementEvent", () => {
  it("rejects invalid payload before dispatch", async () => {
    const eventBus = new TestEventBus();

    await expect(
      publishUserManagementEvent(
        { eventBus },
        USER_MANAGEMENT_EVENT_USER_CREATED,
        {
          tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
          actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
          correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        },
        { id: "not-a-uuid" } as never,
      ),
    ).rejects.toBeInstanceOf(UserManagementEventValidationError);

    expect(eventBus.publishedEvents).toHaveLength(0);
  });

  it("rejects missing envelope metadata before dispatch", async () => {
    const eventBus = new TestEventBus();

    await expect(
      publishUserManagementEvent(
        { eventBus },
        USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
        {
          tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
          actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
          correlationId: "not-a-uuid",
        },
        {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
          user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d484",
          role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d485",
        },
      ),
    ).rejects.toThrow("Invalid envelope metadata");

    expect(eventBus.publishedEvents).toHaveLength(0);
  });

  it("emits runtime event that matches canonical schema contract", async () => {
    const eventBus = new TestEventBus();

    const emitted = await publishUserManagementEvent(
      { eventBus },
      USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
      {
        tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      },
      {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
        user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d484",
        role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d485",
      },
    );

    expect(eventBus.publishedEvents).toHaveLength(1);
    expect(typeof emitted.occurred_at).toBe("string");
    expect(emitted.event_contract_version).toBe("1.0.0");
    expect(
      USER_MANAGEMENT_EVENT_CONTRACTS[USER_MANAGEMENT_EVENT_ROLE_ASSIGNED].validatePayload(
        emitted.payload,
      ),
    ).toBe(true);
  });

  it("rejects old schema_version-only envelope shape", () => {
    expect(() =>
      validateEnvelope({
        event_id: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
        event_type: USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
        source_module: "user-management",
        iq_tenant_id: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        correlation_id: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        actor_id: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        schema_version: "1.0.0",
        payload: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
          user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d484",
          role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d485",
        },
      } as unknown as DomainEvent),
    ).toThrow("event_contract_version");
  });

  it("exports all documented phase-1 event types", () => {
    expect(USER_MANAGEMENT_EVENT_TYPES).toEqual([
      "user-management.user.created",
      "user-management.user.updated",
      "user-management.user.deactivated",
      "user-management.role.assigned",
      "user-management.role.revoked",
    ]);

    for (const eventType of USER_MANAGEMENT_EVENT_TYPES) {
      expect(USER_MANAGEMENT_EVENT_CONTRACTS[eventType]).toBeDefined();
    }
  });
});
