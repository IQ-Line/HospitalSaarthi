import { describe, expect, it, vi } from "vitest";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { ValidationError } from "../domain/errors.js";
import type { AuthPasswordResetterPort } from "../ports/auth-password-resetter.js";
import type { AuthSessionRevokerPort } from "../ports/auth-session-revoker.js";
import { resetUserPassword } from "./reset-user-password.js";

const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d602";
const SAMPLE_NEW_SECRET = "temppass1";
const SAMPLE_TOO_SHORT = "short";

const CTX = {
  tenantId: "tenant-a",
  actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d603",
  correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d604",
};

function buildDeps(userRepository: InMemoryUserRepository): {
  deps: {
    userRepository: InMemoryUserRepository;
    authPasswordResetter: AuthPasswordResetterPort;
    authSessionRevoker: AuthSessionRevokerPort;
  };
  authPasswordResetter: { setPassword: ReturnType<typeof vi.fn> };
  authSessionRevoker: { revokeAllSessionsForPlatformUser: ReturnType<typeof vi.fn> };
} {
  const authPasswordResetter = { setPassword: vi.fn(async () => {
    /* no-op stub */
  }) };
  const authSessionRevoker = { revokeAllSessionsForPlatformUser: vi.fn(async () => {
    /* no-op stub */
  }) };
  return {
    deps: { userRepository, authPasswordResetter, authSessionRevoker },
    authPasswordResetter,
    authSessionRevoker,
  };
}

describe("resetUserPassword", () => {
  it("sets password, revokes sessions, flags must_change_password, and persists the flag", async () => {
    const userRepository = new InMemoryUserRepository();
    const created = userRepository.insertUserWithId(CTX.tenantId, USER_ID, {
      full_name: "Test User",
      email: "test@example.com",
      username: "testuser",
    });
    expect(created.must_change_password).toBe(false);

    const { deps, authPasswordResetter, authSessionRevoker } = buildDeps(userRepository);
    const updateSpy = vi.spyOn(userRepository, "updateUser");

    const updated = await resetUserPassword(deps, CTX, created.id, {
      new_password: SAMPLE_NEW_SECRET,
    });

    // password set via the resetter port (platform user id, not auth id)
    expect(authPasswordResetter.setPassword).toHaveBeenCalledWith(created.id, "temppass1");
    // sessions revoked
    expect(authSessionRevoker.revokeAllSessionsForPlatformUser).toHaveBeenCalledWith(created.id);
    // hardening: revoke MUST run before setPassword, so no old session outlives the new credential
    expect(
      authSessionRevoker.revokeAllSessionsForPlatformUser.mock.invocationCallOrder[0],
    ).toBeLessThan(authPasswordResetter.setPassword.mock.invocationCallOrder[0]);
    // repo update actually invoked with the flag (mutation-proof: removing the flag-set line fails here)
    expect(updateSpy).toHaveBeenCalledWith(CTX.tenantId, created.id, {
      must_change_password: true,
    });
    // returned row reflects the persisted flag, not the stale pre-update row
    expect(updated?.must_change_password).toBe(true);
    // and the stored row is actually updated
    const reread = await userRepository.getUserById(CTX.tenantId, created.id);
    expect(reread?.must_change_password).toBe(true);
  });

  it("returns null for a missing user without touching the resetter or revoker", async () => {
    const userRepository = new InMemoryUserRepository();
    const { deps, authPasswordResetter, authSessionRevoker } = buildDeps(userRepository);

    const result = await resetUserPassword(
      deps,
      CTX,
      "f47ac10b-58cc-4372-a567-0e02b2c3d699",
      { new_password: SAMPLE_NEW_SECRET },
    );

    expect(result).toBeNull();
    expect(authPasswordResetter.setPassword).not.toHaveBeenCalled();
    expect(authSessionRevoker.revokeAllSessionsForPlatformUser).not.toHaveBeenCalled();
  });

  it("throws ValidationError for an invalid password before any side effect", async () => {
    const userRepository = new InMemoryUserRepository();
    const created = userRepository.insertUserWithId(CTX.tenantId, USER_ID, {
      full_name: "Test User",
      email: "test@example.com",
      username: "testuser",
    });
    const { deps, authPasswordResetter } = buildDeps(userRepository);

    await expect(
      resetUserPassword(deps, CTX, created.id, { new_password: SAMPLE_TOO_SHORT }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(authPasswordResetter.setPassword).not.toHaveBeenCalled();
  });
});
