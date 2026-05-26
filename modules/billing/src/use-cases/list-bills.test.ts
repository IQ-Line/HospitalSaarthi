import { describe, expect, it } from "vitest";
import { createInMemoryBillingRepo } from "../data-access/billing.repository.js";
import { seedMockBills } from "../lib/mock-bills.js";
import { listBills } from "./list-bills.js";

const tenantId = "00000000-0000-0000-0000-000000000007";

describe("listBills", () => {
  it("returns tenant bills newest first", async () => {
    const { repo, bills } = createInMemoryBillingRepo();
    seedMockBills(bills);
    const tariffRepo = {
      findById: async () => undefined,
      findByCodeAndProvider: async () => undefined,
      update: async () => undefined,
    };
    const result = await listBills({ billingRepo: repo, tariffRepo }, tenantId, { limit: 10 });
    expect(result.data.length).toBe(3);
    expect(result.data[0]?.bill_number).toBe("BILL-2026-00003");
    expect(result.page.limit).toBe(10);
  });

  it("filters by status", async () => {
    const { repo, bills } = createInMemoryBillingRepo();
    seedMockBills(bills);
    const tariffRepo = {
      findById: async () => undefined,
      findByCodeAndProvider: async () => undefined,
      update: async () => undefined,
    };
    const result = await listBills(
      { billingRepo: repo, tariffRepo },
      tenantId,
      { status: "DRAFT" },
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.status).toBe("DRAFT");
  });
});
