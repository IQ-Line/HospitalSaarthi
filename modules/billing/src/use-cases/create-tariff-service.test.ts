import { describe, expect, it } from "vitest";
import { createTariffMasterRepo } from "../data-access/tariff-master.repository.js";
import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import {
  createTariffService,
  validateTariffCreateUniqueness,
} from "./create-tariff-service.js";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = "2026-05-15T00:00:00.000Z";

function seedRow(partial: Partial<TariffMasterRow>): TariffMasterRow {
  return {
    id: partial.id ?? crypto.randomUUID(),
    iq_tenant_id: TENANT,
    service_code: partial.service_code ?? "REG",
    service_name: partial.service_name ?? "Registration",
    description: null,
    provider_id: partial.provider_id ?? null,
    department_id: partial.department_id ?? null,
    consultation_type_id: partial.consultation_type_id ?? null,
    department: partial.department ?? "frontdesk",
    category: partial.category ?? "registration-fee",
    sub_category: null,
    tax_type: null,
    base_price: "100.0000",
    tax_percentage: "0.0000",
    is_active: true,
    effective_from: NOW,
    effective_to: null,
    created_at: NOW,
    updated_at: NOW,
    created_by: null,
    updated_by: null,
    ...partial,
  };
}

describe("validateTariffCreateUniqueness", () => {
  it("rejects a second active registration fee", async () => {
    const repo = createTariffMasterRepo([
      seedRow({ id: "reg-1", category: "registration-fee", provider_id: null }),
    ]);
    const message = await validateTariffCreateUniqueness(repo, TENANT, {
      service_code: "REG2",
      service_name: "Registration 2",
      base_price: 50,
      category: "registration-fee",
      provider_id: null,
    });
    expect(message).toMatch(/registration_fee_already_exists/);
  });

  it("rejects duplicate doctor in same department", async () => {
    const providerId = "11111111-1111-4111-8111-111111111111";
    const departmentId = "22222222-2222-4222-8222-222222222222";
    const repo = createTariffMasterRepo([
      seedRow({
        id: "doc-1",
        category: "consultation-fee",
        provider_id: providerId,
        department_id: departmentId,
        department: "Cardiology",
      }),
    ]);
    const message = await validateTariffCreateUniqueness(repo, TENANT, {
      service_code: "CONS2",
      service_name: "Consultation",
      base_price: 500,
      category: "consultation-fee",
      provider_id: providerId,
      department_id: departmentId,
      department: "cardiology",
    });
    expect(message).toMatch(/provider_department_tariff_already_exists/);
  });

  it("allows same doctor in a different department", async () => {
    const providerId = "11111111-1111-4111-8111-111111111111";
    const repo = createTariffMasterRepo([
      seedRow({
        id: "doc-1",
        category: "consultation-fee",
        provider_id: providerId,
        department_id: "22222222-2222-4222-8222-222222222222",
        department: "Cardiology",
      }),
    ]);
    const message = await validateTariffCreateUniqueness(repo, TENANT, {
      service_code: "CONS2",
      service_name: "Consultation",
      base_price: 500,
      category: "consultation-fee",
      provider_id: providerId,
      department_id: "33333333-3333-4333-8333-333333333333",
      department: "Psychologist",
    });
    expect(message).toBeNull();
  });
});

describe("createTariffService", () => {
  it("creates the first registration fee", async () => {
    const rows: TariffMasterRow[] = [];
    const repo = createTariffMasterRepo(rows);
    const result = await createTariffService(
      {
        tariffRepo: repo,
        insert: async (tenantId, body) =>
          seedRow({
            iq_tenant_id: tenantId,
            service_code: body.service_code,
            service_name: body.service_name,
            category: body.category ?? "registration-fee",
            provider_id: body.provider_id ?? null,
            department: body.department ?? "frontdesk",
          }),
      },
      TENANT,
      {
        service_code: "REG_FEE",
        service_name: "Registration Fee",
        base_price: 100,
        category: "registration-fee",
        department: "frontdesk",
      },
    );
    expect(result.ok).toBe(true);
  });
});
