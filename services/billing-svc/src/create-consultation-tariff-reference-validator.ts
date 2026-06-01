import type { UserRepository } from "@hims/user-management";
import type { ConsultationTariffReferenceValidator } from "@hims/billing";
import { resolveMasterDataApiBase } from "./resolve-master-data-api-base.js";

type DepartmentPayload = {
  data?: { code?: string; name?: string; display_name?: string };
};

/**
 * Provider check via user-management; department via master-data HTTP.
 */
export function createConsultationTariffReferenceValidator(
  userRepository: UserRepository,
): ConsultationTariffReferenceValidator {
  const masterDataApiBase = resolveMasterDataApiBase();

  return {
    providerExists: async (tenantId, providerId) => {
      const user = await userRepository.getUserById(tenantId, providerId);
      return user !== null;
    },
    resolveDepartment: async (tenantId, departmentId) => {
      if (!masterDataApiBase) return null;

      const url = `${masterDataApiBase}/departments/${departmentId}`;
      const res = await fetch(url, {
        headers: {
          iq_tenant_id: tenantId,
          "x-tenant-id": tenantId,
        },
      });
      if (res.status === 404) return null;
      if (!res.ok) return null;

      const body = (await res.json()) as DepartmentPayload;
      const row = body.data;
      if (!row?.code) return null;

      return {
        code: row.code,
        display_name: row.display_name ?? row.name ?? row.code,
      };
    },
  };
}
