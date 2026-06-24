export const analyticsQueryKeys = {
  all: ['analytics'] as const,
  opdRegistrationBilling: (
    tenantId: string,
    filters: {
      fromDate: string;
      toDate: string;
      registrationSource: string;
      page: number;
      limit: number;
    },
  ) =>
    [
      ...analyticsQueryKeys.all,
      'opd-registration-billing',
      tenantId,
      filters,
    ] as const,
};
