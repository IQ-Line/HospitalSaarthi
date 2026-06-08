export const integrationHubKeys = {
  all: ['integration-hub'] as const,
  integrationTypes: () => [...integrationHubKeys.all, 'integration-types'] as const,
  integrations: (tenantId: string) =>
    [...integrationHubKeys.all, 'integrations', tenantId] as const,
  integrationDetail: (tenantId: string, id: string) =>
    [...integrationHubKeys.integrations(tenantId), id] as const,
  apiKeys: (tenantId: string, integrationId: string) =>
    [...integrationHubKeys.all, 'api-keys', tenantId, integrationId] as const,
};
