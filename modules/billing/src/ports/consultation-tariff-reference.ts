/** Resolved department metadata for tariff generation (code drives internal service_code). */
export type ResolvedDepartment = {
  code: string;
  display_name: string;
};

/**
 * Cross-module reference checks for consultation tariffs.
 * Wired in billing-svc (provider via user-management; department via master-data HTTP).
 */
export interface ConsultationTariffReferenceValidator {
  providerExists(tenantId: string, providerId: string): Promise<boolean>;
  resolveDepartment(
    tenantId: string,
    departmentId: string,
  ): Promise<ResolvedDepartment | null>;
}

/** Permissive validator for tests and mock mode. */
export function createPermissiveConsultationTariffReferenceValidator(): ConsultationTariffReferenceValidator {
  return {
    providerExists: async () => true,
    resolveDepartment: async (_tenantId, departmentId) => ({
      code: `DEPT_${departmentId.replace(/-/g, "").slice(-12).toUpperCase()}`,
      display_name: "Department",
    }),
  };
}
