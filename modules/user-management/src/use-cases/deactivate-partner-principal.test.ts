import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ValidationError } from "../domain/errors.js";
import { InMemoryPartnerPrincipalRepository } from "../data-access/in-memory-partner-principal-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { deactivatePartnerPrincipal } from "./deactivate-partner-principal.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const deps = {
  partnerPrincipalRepository: new InMemoryPartnerPrincipalRepository(),
  userRepository: new InMemoryUserRepository(),
};

describe("deactivatePartnerPrincipal", () => {
  it("rejects invalid integration_id", async () => {
    await expect(
      deactivatePartnerPrincipal(deps, TENANT, "not-a-uuid", randomUUID()),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns null when partner principal is missing", async () => {
    const result = await deactivatePartnerPrincipal(
      deps,
      TENANT,
      randomUUID(),
      randomUUID(),
    );
    expect(result).toBeNull();
  });
});
