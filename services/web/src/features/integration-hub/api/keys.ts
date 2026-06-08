export const integrationHubKeys = {
  all: ['integration-hub'] as const,
  integrationTypes: () => [...integrationHubKeys.all, 'integration-types'] as const,
  integrations: () => [...integrationHubKeys.all, 'integrations'] as const,
  integrationDetail: (id: string) => [...integrationHubKeys.integrations(), id] as const,
  apiKeys: (integrationId: string) =>
    [...integrationHubKeys.all, 'api-keys', integrationId] as const,
};
