import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ValidationError } from "../domain/errors.js";
import { InMemoryPartnerPrincipalRepository } from "../data-access/in-memory-partner-principal-repository.js";
import { deactivatePartnerPrincipal } from "./deactivate-partner-principal.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("deactivatePartnerPrincipal", () => {
  it("rejects invalid integration_id", async () => {
    await expect(
      deactivatePartnerPrincipal(
        { partnerPrincipalRepository: new InMemoryPartnerPrincipalRepository() },
        TENANT,
        "not-a-uuid",
        randomUUID(),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns null when partner principal is missing", async () => {
    const result = await deactivatePartnerPrincipal(
      { partnerPrincipalRepository: new InMemoryPartnerPrincipalRepository() },
      TENANT,
      randomUUID(),
      randomUUID(),
    );
    expect(result).toBeNull();
  });
});
