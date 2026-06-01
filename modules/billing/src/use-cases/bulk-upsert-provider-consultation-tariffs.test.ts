import { describe, expect, it, beforeEach } from "vitest";
import { createConsultationTypesRepo } from "../data-access/consultation-types.repository.js";
import { createTariffMasterRepo } from "../data-access/tariff-master.repository.js";
import { DEFAULT_CONSULTATION_TYPE_CODE } from "../domain/consultation-types.types.js";
import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import { createPermissiveConsultationTariffReferenceValidator } from "../ports.js";
import { bulkUpsertProviderConsultationTariffs } from "./bulk-upsert-provider-consultation-tariffs.js";

const tenantId = "00000000-0000-0000-0000-000000000007";
const providerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const deptCardio = "dddddddd-dddd-4ddd-8ddd-dddddddddd01";
const deptNeuro = "dddddddd-dddd-4ddd-8ddd-dddddddddd02";

describe("bulkUpsertProviderConsultationTariffs", () => {
  const rows: TariffMasterRow[] = [];

  const tariffRepo = createTariffMasterRepo(rows);
  const consultationTypesRepo = createConsultationTypesRepo("memory");
  const referenceValidator = createPermissiveConsultationTariffReferenceValidator();

  const deps = { tariffRepo, consultationTypesRepo, referenceValidator };

  let consultationTypeId: string;

  beforeEach(async () => {
    rows.length = 0;
    await consultationTypesRepo.ensureDefaultTypes(tenantId);
    const type = await consultationTypesRepo.findById(tenantId, "cccccccc-cccc-4ccc-8ccc-cccccccccc01");
    consultationTypeId = type!.id;
  });

  it("creates distinct tariffs per department for the same provider", async () => {
    const result = await bulkUpsertProviderConsultationTariffs(deps, tenantId, {
      provider_id: providerId,
      items: [
        {
          department_id: deptCardio,
          consultation_type_id: consultationTypeId,
          base_price: "800.00",
          tax_percentage: "18",
        },
        {
          department_id: deptNeuro,
          consultation_type_id: consultationTypeId,
          base_price: "1200.00",
          tax_percentage: "18",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0]?.base_price).toBe("800.0000");
    expect(result.data[1]?.base_price).toBe("1200.0000");
    expect(result.data[0]?.service_code).toContain("CONSULT_");
    expect(result.data[0]?.service_code).not.toBe(result.data[1]?.service_code);
  });

  it("updates existing row on retry (idempotent)", async () => {
    const input = {
      provider_id: providerId,
      items: [
        {
          department_id: deptCardio,
          consultation_type_id: consultationTypeId,
          base_price: "800.00",
        },
      ],
    };
    const first = await bulkUpsertProviderConsultationTariffs(deps, tenantId, input);
    const second = await bulkUpsertProviderConsultationTariffs(deps, tenantId, {
      ...input,
      items: [{ ...input.items[0]!, base_price: "850.00" }],
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.data[0]?.id).toBe(second.data[0]?.id);
    expect(second.data[0]?.base_price).toBe("850.0000");
  });

  it("rejects duplicate department/type pairs in one request", async () => {
    const result = await bulkUpsertProviderConsultationTariffs(deps, tenantId, {
      provider_id: providerId,
      items: [
        {
          department_id: deptCardio,
          consultation_type_id: consultationTypeId,
          base_price: "800",
        },
        {
          department_id: deptCardio,
          consultation_type_id: consultationTypeId,
          base_price: "900",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("VALIDATION");
  });

  it("rejects unknown consultation type", async () => {
    const result = await bulkUpsertProviderConsultationTariffs(deps, tenantId, {
      provider_id: providerId,
      items: [
        {
          department_id: deptCardio,
          consultation_type_id: "99999999-9999-4999-8999-999999999999",
          base_price: "100",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NOT_FOUND");
  });

  it("seeds GENERAL_CONSULTATION type for tenant", async () => {
    await consultationTypesRepo.ensureDefaultTypes(tenantId);
    const rows = await consultationTypesRepo.findById(
      tenantId,
      "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
    );
    expect(rows?.code).toBe(DEFAULT_CONSULTATION_TYPE_CODE);
  });
});
