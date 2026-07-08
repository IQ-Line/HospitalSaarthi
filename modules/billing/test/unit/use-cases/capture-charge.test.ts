import { describe, expect, it } from "vitest";
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
  it("creates bill and line from tariff", async () => {
    const { repo } = createInMemoryBillingRepo();
    const result = await captureCharge(
      { tariffRepo: tariffRepo(tariff), billingRepo: repo },
      tenantId,
      { patient_id: patientId, source_module: "opd", item_code: "REG_FEE" },
      { idempotencyKey: "idem-1" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.snapshotted_unit_price).toBe("100.0000");
  });

  it("creating a plain charge needs no override authorization", async () => {
    // No override fields → the gate never triggers even with canOverridePrice omitted (false).
    const { repo } = createInMemoryBillingRepo();
    const result = await captureCharge(
      { tariffRepo: tariffRepo(tariff), billingRepo: repo },
      tenantId,
      { patient_id: patientId, source_module: "opd", item_code: "REG_FEE" },
    );
    expect(result.ok).toBe(true);
  });

  it("snapshots desk unit_price_override when the caller holds the override capability", async () => {
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
      { idempotencyKey: "idem-desk", canOverridePrice: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.snapshotted_unit_price).toBe("88.0000");
  });

  it("allows a line-discount override when the caller is authorized", async () => {
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
      { canOverridePrice: true },
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a line-discount override when the caller lacks the override capability", async () => {
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
      { canOverridePrice: false },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FORBIDDEN");
    expect(result.message).toContain("desk_price_overrides_forbidden");
    expect(result.message).toContain("override-price");
  });

  it("rejects a unit_price_override when authorization is absent (default fail-closed)", async () => {
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
      // canOverridePrice omitted → defaults to false.
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FORBIDDEN");
    expect(result.message).toContain("desk_price_overrides_forbidden");
  });

  it("denies the override before touching the catalog (unauthorized wins over NOT_FOUND)", async () => {
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
    expect(result.code).toBe("FORBIDDEN");
  });

  it("returns 404 when catalog row missing even for an authorized override", async () => {
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
      { canOverridePrice: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NOT_FOUND");
  });
});
