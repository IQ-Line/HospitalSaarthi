export const dashboardKeys = {
  all: ['dashboard'] as const,
  facilities: () => [...dashboardKeys.all, 'facilities'] as const,
  metrics: (tenantId: string | null) => [...dashboardKeys.all, 'metrics', tenantId] as const,
};
