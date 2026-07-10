import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  refreshAuthorizationContext,
  resetAuthorizationHydrationTracker,
} from "../../../src/lib/authorization-context";
import { authPrincipalQueryKeys } from "../../../src/lib/auth-principal-query";

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

const invalidateModuleRegistration = vi.hoisted(() => vi.fn());

vi.mock("@/platform/modules/module-catalog", () => ({
  invalidateModuleRegistration,
}));

const scope = {
  userId: "user-1",
  tenantId: "tenant-a",
  activeBranch: "main",
} as const;

const principal = {
  id: "user-1",
  roles: ["platform_operator"],
  attributes: {
    capabilities: ["users:users:read"],
    delegated_capabilities: [],
  },
};

function isPrincipalQueryKey(key: readonly unknown[]): boolean {
  return JSON.stringify(key) === JSON.stringify(authPrincipalQueryKeys.detail(scope));
}

function createQueryClient(overrides?: {
  cachedPrincipal?: typeof principal;
}) {
  return {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    getQueryData: vi.fn((key: readonly unknown[]) => {
      if (isPrincipalQueryKey(key)) {
        return overrides?.cachedPrincipal;
      }
      return undefined;
    }),
    fetchQuery: vi.fn(async (options: { queryKey: readonly unknown[] }) => {
      if (isPrincipalQueryKey(options.queryKey)) {
        return principal;
      }
      return { data: [] };
    }),
    removeQueries: vi.fn(),
    ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) => {
      if (isPrincipalQueryKey(options.queryKey)) {
        return principal;
      }
      return { data: [] };
    }),
  } as unknown as QueryClient;
}

function mockAuthenticatedSession() {
  authGetState.mockReturnValue({
    isAuthenticated: true,
    userId: "user-1",
    accessToken: "jwt-token",
  });
  tenantGetState.mockReturnValue({
    tenantId: "tenant-a",
    activeBranch: "main",
  });
}

describe("refreshAuthorizationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthorizationHydrationTracker();
    invalidateModuleRegistration.mockClear();
    permissionsGetState.mockReturnValue({
      clearPermissions,
      isLoaded: false,
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

    const queryClient = createQueryClient();

    await refreshAuthorizationContext(queryClient);

    expect(clearPermissions).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: authPrincipalQueryKeys.all,
    });
    expect(hydrateCapabilitiesFromPrincipal).not.toHaveBeenCalled();
  });

  it("clears permissions when authenticated but access token is missing", async () => {
    authGetState.mockReturnValue({
      isAuthenticated: true,
      userId: "user-1",
      accessToken: null,
    });
    tenantGetState.mockReturnValue({
      tenantId: "tenant-a",
      activeBranch: "main",
    });

    const queryClient = createQueryClient();

    await refreshAuthorizationContext(queryClient);

    expect(clearPermissions).toHaveBeenCalledTimes(1);
    expect(hydrateCapabilitiesFromPrincipal).not.toHaveBeenCalled();
  });

  it("clears permissions when authenticated but tenant scope is missing", async () => {
    authGetState.mockReturnValue({
      isAuthenticated: true,
      userId: "user-1",
      accessToken: "jwt-token",
    });
    tenantGetState.mockReturnValue({
      tenantId: "  ",
      activeBranch: "main",
    });

    const queryClient = createQueryClient();

    await refreshAuthorizationContext(queryClient);

    expect(clearPermissions).toHaveBeenCalledTimes(1);
    expect(hydrateCapabilitiesFromPrincipal).not.toHaveBeenCalled();
  });

  it("fetches principal and hydrates on first authenticated refresh (hard refresh)", async () => {
    mockAuthenticatedSession();
    permissionsGetState.mockReturnValue({
      clearPermissions,
      isLoaded: false,
    });

    const queryClient = createQueryClient();

    await refreshAuthorizationContext(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: authPrincipalQueryKeys.all,
    });
    expect(queryClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: authPrincipalQueryKeys.detail(scope),
      }),
    );
    expect(hydrateCapabilitiesFromPrincipal).toHaveBeenCalledWith(principal);
    expect(clearPermissions).not.toHaveBeenCalled();
  });

  it("skips principal network when same scope, cache hit, and permissions already loaded", async () => {
    mockAuthenticatedSession();
    permissionsGetState.mockReturnValue({
      clearPermissions,
      isLoaded: false,
    });

    const queryClient = createQueryClient();

    await refreshAuthorizationContext(queryClient);

    vi.mocked(queryClient.fetchQuery).mockClear();
    vi.mocked(queryClient.invalidateQueries).mockClear();
    hydrateCapabilitiesFromPrincipal.mockClear();

    permissionsGetState.mockReturnValue({
      clearPermissions,
      isLoaded: true,
    });
    vi.mocked(queryClient.getQueryData).mockImplementation((key: readonly unknown[]) => {
      if (isPrincipalQueryKey(key)) {
        return principal;
      }
      return undefined;
    });

    await refreshAuthorizationContext(queryClient);

    expect(
      vi
        .mocked(queryClient.fetchQuery)
        .mock.calls.some((call) =>
          isPrincipalQueryKey((call[0] as { queryKey: readonly unknown[] }).queryKey),
        ),
    ).toBe(false);
    expect(hydrateCapabilitiesFromPrincipal).not.toHaveBeenCalled();
  });

  it("hydrates from cache without principal fetch when same scope, cache hit, and not loaded", async () => {
    mockAuthenticatedSession();
    permissionsGetState.mockReturnValue({
      clearPermissions,
      isLoaded: false,
    });

    const queryClient = createQueryClient();

    await refreshAuthorizationContext(queryClient);

    vi.mocked(queryClient.fetchQuery).mockClear();
    hydrateCapabilitiesFromPrincipal.mockClear();

    permissionsGetState.mockReturnValue({
      clearPermissions,
      isLoaded: false,
    });
    vi.mocked(queryClient.getQueryData).mockImplementation((key: readonly unknown[]) => {
      if (isPrincipalQueryKey(key)) {
        return principal;
      }
      return undefined;
    });

    await refreshAuthorizationContext(queryClient);

    expect(
      vi
        .mocked(queryClient.fetchQuery)
        .mock.calls.some((call) =>
          isPrincipalQueryKey((call[0] as { queryKey: readonly unknown[] }).queryKey),
        ),
    ).toBe(false);
    expect(hydrateCapabilitiesFromPrincipal).toHaveBeenCalledWith(principal);
  });

  it("invalidates module registration only when tenant changes between refreshes", async () => {
    mockAuthenticatedSession();
    permissionsGetState.mockReturnValue({
      clearPermissions,
      isLoaded: false,
    });

    const queryClient = createQueryClient();

    await refreshAuthorizationContext(queryClient);
    expect(invalidateModuleRegistration).toHaveBeenCalledTimes(1);
    expect(invalidateModuleRegistration).toHaveBeenCalledWith(queryClient, "tenant-a");

    invalidateModuleRegistration.mockClear();
    permissionsGetState.mockReturnValue({
      clearPermissions,
      isLoaded: true,
    });
    vi.mocked(queryClient.getQueryData).mockImplementation((key: readonly unknown[]) => {
      if (isPrincipalQueryKey(key)) {
        return principal;
      }
      return { data: [] };
    });

    await refreshAuthorizationContext(queryClient);

    expect(invalidateModuleRegistration).not.toHaveBeenCalled();
  });

  it("invalidates and refetches principal when auth scope changes", async () => {
    mockAuthenticatedSession();
    permissionsGetState.mockReturnValue({
      clearPermissions,
      isLoaded: false,
    });

    const queryClient = createQueryClient();

    await refreshAuthorizationContext(queryClient);

    hydrateCapabilitiesFromPrincipal.mockClear();

    tenantGetState.mockReturnValue({
      tenantId: "tenant-b",
      activeBranch: "main",
    });

    const scopeB = {
      userId: "user-1",
      tenantId: "tenant-b",
      activeBranch: "main",
    };

    await refreshAuthorizationContext(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: authPrincipalQueryKeys.all,
    });
    expect(queryClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: authPrincipalQueryKeys.detail(scopeB),
      }),
    );
    expect(hydrateCapabilitiesFromPrincipal).toHaveBeenCalledTimes(1);
  });
});
