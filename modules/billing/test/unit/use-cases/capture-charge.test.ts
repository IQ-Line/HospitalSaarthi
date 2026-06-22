import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TariffMasterRow } from "../../../src/domain/tariff-master.types.js";
import { applyTariffPatch } from "../../../src/lib/tariff-api.js";
import { createInMemoryBillingRepo } from "../../../src/data-access/billing.repository.js";
import type { TariffMasterRepo } from "../../../src/ports.js";
import { captureCharge } from "../../../src/use-cases/capture-charge.js";

const tenantId = "00000000-0000-0000-0000-000000000007";
const patientId = "11111111-1111-1111-1111-111111111111";

const tariff: TariffMasterRow = {
  id: "22222222-2222-2222-2222-222222222222",
  iq_tenant_id: tenantId,
  service_code: "REG_FEE",
  service_name: "Registration Fee",
  description: null,
  provider_id: null,
  department_id: null,
  category: "registration",
  sub_category: null,
  tax_type: "EXEMPT",
  base_price: "100.0000",
  tax_percentage: "0.0000",
  is_active: true,
  effective_from: "2026-01-01T00:00:00.000Z",
  effective_to: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  created_by: null,
  updated_by: null,
};

function tariffRepo(row: TariffMasterRow): TariffMasterRepo {
  return {
    findById: async () => row,
    findByCodeAndProvider: async (t, code, providerId) =>
      t === row.iq_tenant_id && code === row.service_code && providerId === row.provider_id
        ? row
        : undefined,
    update: async (_t, _id, patch) => applyTariffPatch(row, patch),
  };
}

const emptyTariffRepo: TariffMasterRepo = {
  findById: async () => undefined,
  findByCodeAndProvider: async () => undefined,
  update: async () => undefined,
};

describe("captureCharge", () => {
  const prevDeskOverrides = process.env["BILLING_ALLOW_DESK_OVERRIDES"];
  const prevNodeEnv = process.env["NODE_ENV"];

  beforeEach(() => {
    process.env["BILLING_ALLOW_DESK_OVERRIDES"] = "true";
    process.env["NODE_ENV"] = "development";
  });

  afterAll(() => {
    if (prevDeskOverrides === undefined) {
      delete process.env["BILLING_ALLOW_DESK_OVERRIDES"];
    } else {
      process.env["BILLING_ALLOW_DESK_OVERRIDES"] = prevDeskOverrides;
    }
    if (prevNodeEnv === undefined) {
      delete process.env["NODE_ENV"];
    } else {
      process.env["NODE_ENV"] = prevNodeEnv;
    }
  });

  it("creates bill and line from tariff", async () => {
    const { repo } = createInMemoryBillingRepo();
    const result = await captureCharge(
      { tariffRepo: tariffRepo(tariff), billingRepo: repo },
      tenantId,
      { patient_id: patientId, source_module: "opd", item_code: "REG_FEE" },
      "idem-1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.snapshotted_unit_price).toBe("100.0000");
  });

  it("snapshots desk unit_price_override when allowed", async () => {
    const { repo } = createInMemoryBillingRepo();
    const result = await captureCharge(
      { tariffRepo: tariffRepo(tariff), billingRepo: repo },
      tenantId,
      {
        patient_id: patientId,
        source_module: "registration",
        item_code: "REG_FEE",
        unit_price_override: 88,
        tax_percentage_override: 0,
      },
      "idem-desk",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.snapshotted_unit_price).toBe("88.0000");
  });

  it("allows desk overrides in development when env is unset", async () => {
    delete process.env["BILLING_ALLOW_DESK_OVERRIDES"];
    process.env["NODE_ENV"] = "development";
    const { repo } = createInMemoryBillingRepo();
    const result = await captureCharge(
      { tariffRepo: tariffRepo(tariff), billingRepo: repo },
      tenantId,
      {
        patient_id: patientId,
        source_module: "registration",
        item_code: "REG_FEE",
        line_discount_percentage: 10,
      },
    );
    expect(result.ok).toBe(true);
  });

  it("rejects desk overrides when explicitly disabled in development", async () => {
    process.env["BILLING_ALLOW_DESK_OVERRIDES"] = "false";
    process.env["NODE_ENV"] = "development";
    const { repo } = createInMemoryBillingRepo();
    const result = await captureCharge(
      { tariffRepo: tariffRepo(tariff), billingRepo: repo },
      tenantId,
      {
        patient_id: patientId,
        source_module: "registration",
        item_code: "REG_FEE",
        line_discount_percentage: 10,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("desk_price_overrides_disabled");
  });

  it("rejects desk overrides when disabled in production", async () => {
    delete process.env["BILLING_ALLOW_DESK_OVERRIDES"];
    process.env["NODE_ENV"] = "production";
    const { repo } = createInMemoryBillingRepo();
    const result = await captureCharge(
      { tariffRepo: tariffRepo(tariff), billingRepo: repo },
      tenantId,
      {
        patient_id: patientId,
        source_module: "registration",
        item_code: "REG_FEE",
        unit_price_override: 88,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("VALIDATION");
    expect(result.message).toContain("desk_price_overrides_disabled");
    expect(result.message).toContain("#94");
  });

  it("returns 404 when catalog row missing even with override", async () => {
    const { repo } = createInMemoryBillingRepo();
    const result = await captureCharge(
      { tariffRepo: emptyTariffRepo, billingRepo: repo },
      tenantId,
      {
        patient_id: patientId,
        source_module: "registration",
        item_code: "REG_FEE",
        unit_price_override: 88,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NOT_FOUND");
  });
});
