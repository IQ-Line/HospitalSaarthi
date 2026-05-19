import { describe, expect, it } from "vitest";
import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import { applyTariffPatch } from "../lib/tariff-api.js";
import { createInMemoryBillingRepo } from "../data-access/billing.repository.js";
import type { TariffMasterRepo } from "../ports.js";
import { captureCharge } from "./capture-charge.js";

const tenantId = "00000000-0000-0000-0000-000000000007";
const patientId = "11111111-1111-1111-1111-111111111111";

const tariff: TariffMasterRow = {
  id: "22222222-2222-2222-2222-222222222222",
  iq_tenant_id: tenantId,
  service_code: "REG_FEE",
  service_name: "Registration Fee",
  description: null,
  provider_id: null,
  department: "frontdesk",
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

describe("captureCharge", () => {
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
    expect(result.data.replayed).toBe(false);
    expect(result.data.snapshotted_unit_price).toBe("100.0000");
    expect(result.data.net_amount).toBe("100.0000");
  });

  it("replays idempotency key", async () => {
    const { repo } = createInMemoryBillingRepo();
    const deps = { tariffRepo: tariffRepo(tariff), billingRepo: repo };
    const first = await captureCharge(deps, tenantId, {
      patient_id: patientId,
      source_module: "opd",
      item_code: "REG_FEE",
    }, "idem-2");
    const second = await captureCharge(deps, tenantId, {
      patient_id: patientId,
      source_module: "opd",
      item_code: "REG_FEE",
    }, "idem-2");
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.data.replayed).toBe(true);
    expect(second.data.bill_item_id).toBe(first.data.bill_item_id);
  });

  it("returns 404 when catalog row missing", async () => {
    const { repo } = createInMemoryBillingRepo();
    const result = await captureCharge(
      { tariffRepo: tariffRepo(tariff), billingRepo: repo },
      tenantId,
      { patient_id: patientId, source_module: "opd", item_code: "UNKNOWN" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NOT_FOUND");
  });
});
