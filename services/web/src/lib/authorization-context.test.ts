import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshAuthorizationContext } from "./authorization-context";
import { authPrincipalQueryKeys } from "./auth-principal-query";

const {
  hydrateCapabilitiesFromPrincipal,
  clearPermissions,
  authGetState,
  tenantGetState,
  permissionsGetState,
} = vi.hoisted(() => ({
  hydrateCapabilitiesFromPrincipal: vi.fn(),
  clearPermissions: vi.fn(),
  authGetState: vi.fn(),
  tenantGetState: vi.fn(),
  permissionsGetState: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  hydrateCapabilitiesFromPrincipal,
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: {
    getState: authGetState,
  },
}));

vi.mock("@/stores/tenant.store", () => ({
  useTenantStore: {
    getState: tenantGetState,
  },
}));

vi.mock("@/stores/permissions.store", () => ({
  usePermissionsStore: {
    getState: permissionsGetState,
  },
}));

describe("refreshAuthorizationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionsGetState.mockReturnValue({
      clearPermissions,
    });
  });

  it("clears permissions and only invalidates principal cache when auth scope is incomplete", async () => {
    authGetState.mockReturnValue({
      isAuthenticated: false,
      userId: null,
    });
    tenantGetState.mockReturnValue({
      tenantId: null,
      activeBranch: null,
    });

    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      fetchQuery: vi.fn().mockResolvedValue(undefined),
    } as unknown as QueryClient;

    await refreshAuthorizationContext(queryClient);

    expect(clearPermissions).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: authPrincipalQueryKeys.all,
    });
    expect(queryClient.fetchQuery).not.toHaveBeenCalled();
    expect(hydrateCapabilitiesFromPrincipal).not.toHaveBeenCalled();
  });

  it("refreshes principal query and hydrates capabilities for an authenticated session", async () => {
    authGetState.mockReturnValue({
      isAuthenticated: true,
      userId: "user-1",
    });
    tenantGetState.mockReturnValue({
      tenantId: "tenant-a",
      activeBranch: "main",
    });

    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      fetchQuery: vi.fn().mockResolvedValue(undefined),
    } as unknown as QueryClient;

    await refreshAuthorizationContext(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: authPrincipalQueryKeys.all,
    });
    expect(queryClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: authPrincipalQueryKeys.detail({
          userId: "user-1",
          tenantId: "tenant-a",
          activeBranch: "main",
        }),
      }),
    );
    expect(hydrateCapabilitiesFromPrincipal).toHaveBeenCalledTimes(1);
    expect(clearPermissions).not.toHaveBeenCalled();
  });
});
