import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it, vi } from "vitest";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { UserNotFoundError, ValidationError } from "../domain/errors.js";
import type { AuthPasswordAdminPort } from "../ports/auth-password-admin.js";
import type { AuthSessionRevokerPort } from "../ports/auth-session-revoker.js";
import { resetUserPassword } from "./reset-user-password.js";

const AUTH_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d601";
const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d602";
const CTX = {
  tenantId: "tenant-a",
  actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d603",
  correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d604",
};

class TestEventBus implements EventBus {
  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async publish(_event: DomainEvent): Promise<void> {}

  async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
    return { async unsubscribe(): Promise<void> {} };
  }
}

describe("resetUserPassword", () => {
  it("sets temp password, revokes sessions, and flags must_change_password", async () => {
    const userRepository = new InMemoryUserRepository();
    const created = userRepository.insertUserWithId("tenant-a", USER_ID, {
      full_name: "Test User",
      email: "test@example.com",
      username: "testuser",
      password: "unused",
    });
    await userRepository.updateUser("tenant-a", created.id, {
      auth_user_id: AUTH_USER_ID,
    });

    const authPasswordAdmin: AuthPasswordAdminPort = {
      setUserPassword: vi.fn(async () => {}),
      revokeUserSessions: vi.fn(async () => {}),
    };
    const authSessionRevoker: AuthSessionRevokerPort = {
      revokeAllSessionsForPlatformUser: vi.fn(async () => {}),
    };

    const updated = await resetUserPassword(
      {
        userRepository,
        eventBus: new TestEventBus(),
        authPasswordAdmin,
        authSessionRevoker,
      },
      CTX,
      created.id,
      { password: "temppass1" },
    );

    expect(authPasswordAdmin.setUserPassword).toHaveBeenCalledWith(AUTH_USER_ID, "temppass1");
    expect(authPasswordAdmin.revokeUserSessions).toHaveBeenCalledWith(AUTH_USER_ID);
    expect(authSessionRevoker.revokeAllSessionsForPlatformUser).toHaveBeenCalledWith(created.id);
    expect(updated.must_change_password).toBe(true);
  });

  it("throws when user has no linked auth account", async () => {
    const userRepository = new InMemoryUserRepository();
    const created = userRepository.insertUserWithId("tenant-a", "f47ac10b-58cc-4372-a567-0e02b2c3d615", {
      full_name: "No Auth",
      email: "noauth@example.com",
      username: "noauth",
      password: "unused",
    });

    await expect(
      resetUserPassword(
        {
          userRepository,
          eventBus: new TestEventBus(),
          authPasswordAdmin: { setUserPassword: vi.fn(), revokeUserSessions: vi.fn() },
        },
        CTX,
        created.id,
        { password: "temppass1" },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws UserNotFoundError for missing user", async () => {
    await expect(
      resetUserPassword(
        {
          userRepository: new InMemoryUserRepository(),
          eventBus: new TestEventBus(),
          authPasswordAdmin: { setUserPassword: vi.fn(), revokeUserSessions: vi.fn() },
        },
        CTX,
        "f47ac10b-58cc-4372-a567-0e02b2c3d699",
        { password: "temppass1" },
      ),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
