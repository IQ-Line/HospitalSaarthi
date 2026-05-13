import type { OrganizationStatus, OrganizationType } from '../types';

export const configuratorKeys = {
  all: ['configurator'] as const,
  organizations: (filters: {
    status?: OrganizationStatus;
    type?: OrganizationType;
  }) => [...configuratorKeys.all, 'organizations', filters] as const,
  organizationDetail: (id: string) =>
    [...configuratorKeys.all, 'organization', id] as const,
};
