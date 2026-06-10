import type { PrincipalService } from "../ports/index.js";

export function createPrincipalServiceStub(): PrincipalService {
  return {
    async getPrincipal() {
      return {
        id: "user-1",
        roles: ["tenant-admin"],
        attributes: {
          iq_tenant_id: "tenant-a",
          org_id: null,
          department: null,
          role_codes: ["tenant-admin"],
          capabilities: [],
          delegated_capabilities: [],
          clearances: {},
          um_clearance_effective_tier: 0,
        },
      };
    },
  };
}
