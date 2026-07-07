import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { UserNotFoundError } from "../domain/errors.js";
import { clearMustChangePassword } from "./clear-must-change-password.js";

const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d611";
const USER_ID_2 = "f47ac10b-58cc-4372-a567-0e02b2c3d612";
const CTX = {
  tenantId: "tenant-a",
  actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d613",
  correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d614",
};

class TestEventBus implements EventBus {
  async connect(): Promise<void> {
    // no-op: in-memory test double
  }

  async disconnect(): Promise<void> {
    // no-op: in-memory test double
  }

  async publish(_event: DomainEvent): Promise<void> {
    // no-op: events are irrelevant to this use-case under test
  }

  async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
    return {
      async unsubscribe(): Promise<void> {
        // no-op: in-memory test double
      },
    };
  }
}

describe("clearMustChangePassword", () => {
  it("clears must_change_password when flag is set", async () => {
    const userRepository = new InMemoryUserRepository();
    const created = userRepository.insertUserWithId("tenant-a", USER_ID, {
      full_name: "Reset User",
      email: "reset@example.com",
      username: "resetuser",
    });
    await userRepository.updateUser("tenant-a", created.id, { must_change_password: true });

    const updated = await clearMustChangePassword(
      { userRepository, eventBus: new TestEventBus() },
      CTX,
      created.id,
    );

    expect(updated.must_change_password).toBe(false);
  });

  it("returns user unchanged when must_change_password is false", async () => {
    const userRepository = new InMemoryUserRepository();
    const created = userRepository.insertUserWithId("tenant-a", USER_ID_2, {
      full_name: "Normal User",
      email: "normal@example.com",
      username: "normaluser",
    });

    const updated = await clearMustChangePassword(
      { userRepository, eventBus: new TestEventBus() },
      CTX,
      created.id,
    );

    expect(updated.must_change_password).toBe(false);
  });

  it("throws UserNotFoundError for missing user", async () => {
    await expect(
      clearMustChangePassword(
        { userRepository: new InMemoryUserRepository(), eventBus: new TestEventBus() },
        CTX,
        "f47ac10b-58cc-4372-a567-0e02b2c3d699",
      ),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
