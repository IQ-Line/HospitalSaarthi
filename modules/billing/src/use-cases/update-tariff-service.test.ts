import { describe, expect, it } from "vitest";
import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import { applyTariffPatch } from "../lib/tariff-api.js";
import type { TariffMasterRepo } from "../ports.js";
import { updateTariffService } from "./update-tariff-service.js";

const baseRow: TariffMasterRow = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  iq_tenant_id: "00000000-0000-0000-0000-000000000007",
  service_code: "LAB_CBC",
  service_name: "CBC Test",
  description: null,
  provider_id: null,
  department_id: null,
  category: "lab",
  sub_category: null,
  tax_type: "CGST_SGST",
  base_price: "150.0000",
  tax_percentage: "0.0000",
  is_active: true,
  effective_from: "2026-01-01T00:00:00.000Z",
  effective_to: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  created_by: null,
  updated_by: null,
};

function createRepo(row: TariffMasterRow): TariffMasterRepo {
  let current = { ...row };
  return {
    findById: async () => current,
    update: async (_t, _id, patch) => {
      current = applyTariffPatch(current, patch);
      return current;
    },
  };
}

describe("updateTariffService", () => {
  it("returns NOT_FOUND when service is missing", async () => {
    const result = await updateTariffService(
      { tariffRepo: { findById: async () => undefined, update: async () => undefined } },
      baseRow.iq_tenant_id,
      baseRow.id,
      { service_name: "Updated" },
    );
    expect(result).toEqual({ ok: false, code: "NOT_FOUND", message: "Service not found" });
  });

  it("sets effective_from to now when price changes without an explicit date", async () => {
    const before = Date.now();
    const result = await updateTariffService(
      { tariffRepo: createRepo(baseRow) },
      baseRow.iq_tenant_id,
      baseRow.id,
      { base_price: "175.0000" },
    );
    const after = Date.now();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const effectiveMs = new Date(result.data.effective_from).getTime();
    expect(effectiveMs).toBeGreaterThanOrEqual(before);
    expect(effectiveMs).toBeLessThanOrEqual(after);
    expect(result.data.base_price).toBe("175.0000");
  });

  it("rejects effective_to before effective_from", async () => {
    const result = await updateTariffService(
      { tariffRepo: createRepo(baseRow) },
      baseRow.iq_tenant_id,
      baseRow.id,
      {
        effective_from: "2026-06-01T00:00:00.000Z",
        effective_to: "2026-05-01T00:00:00.000Z",
      },
    );
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION",
      message: "effective_to must be after effective_from",
    });
  });
});
