import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import type { CreateUserInput } from "../ports/index.js";
import { createUser } from "./create-user.js";

class TestEventBus implements EventBus {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async publish(_event: DomainEvent): Promise<void> {}
  async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
    return { async unsubscribe(): Promise<void> {} };
  }
}

describe("createUser", () => {
  it("rejects non-string full_name", async () => {
    await expect(
      createUser(
        { userRepository: new InMemoryUserRepository(), eventBus: new TestEventBus() },
        {
          tenantId: "t1",
          actorId: "a1",
          correlationId: "c1",
        },
        { full_name: 123 } as unknown as CreateUserInput,
      ),
    ).rejects.toMatchObject({ issue: "full_name_invalid_type" });
  });

  it("rejects blank full_name", async () => {
    await expect(
      createUser(
        { userRepository: new InMemoryUserRepository(), eventBus: new TestEventBus() },
        {
          tenantId: "t1",
          actorId: "a1",
          correlationId: "c1",
        },
        { full_name: "   " },
      ),
    ).rejects.toMatchObject({ issue: "full_name_empty" });
  });
});
