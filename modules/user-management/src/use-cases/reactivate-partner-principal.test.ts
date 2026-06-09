import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ValidationError } from "../domain/errors.js";
import { InMemoryPartnerPrincipalRepository } from "../data-access/in-memory-partner-principal-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { reactivatePartnerPrincipal } from "./reactivate-partner-principal.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const deps = {
  partnerPrincipalRepository: new InMemoryPartnerPrincipalRepository(),
  userRepository: new InMemoryUserRepository(),
};

describe("reactivatePartnerPrincipal", () => {
  it("rejects invalid integration_id", async () => {
    await expect(
      reactivatePartnerPrincipal(deps, TENANT, "bad-id", randomUUID()),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns null when partner principal is missing", async () => {
    const result = await reactivatePartnerPrincipal(
      deps,
      TENANT,
      randomUUID(),
      randomUUID(),
    );
    expect(result).toBeNull();
  });
});
