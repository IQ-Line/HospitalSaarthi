import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ValidationError } from "../domain/errors.js";
import { InMemoryPartnerPrincipalRepository } from "../data-access/in-memory-partner-principal-repository.js";
import { reactivatePartnerPrincipal } from "./reactivate-partner-principal.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("reactivatePartnerPrincipal", () => {
  it("rejects invalid integration_id", async () => {
    await expect(
      reactivatePartnerPrincipal(
        { partnerPrincipalRepository: new InMemoryPartnerPrincipalRepository() },
        TENANT,
        "bad-id",
        randomUUID(),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns null when partner principal is missing", async () => {
    const result = await reactivatePartnerPrincipal(
      { partnerPrincipalRepository: new InMemoryPartnerPrincipalRepository() },
      TENANT,
      randomUUID(),
      randomUUID(),
    );
    expect(result).toBeNull();
  });
});
