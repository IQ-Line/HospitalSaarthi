import type { DepartmentCatalogPort } from "../ports/module-integration-ports.js";

export function createDepartmentCatalogPortStub(
  overrides: Partial<DepartmentCatalogPort> = {},
): DepartmentCatalogPort {
  return {
    async resolveDepartmentName() {
      return null;
    },
    ...overrides,
  };
}
