export const smartParchaKeys = {
  all: ['smart-parcha'] as const,
  fullContext: (visitId: string, addendum?: boolean) =>
    [...smartParchaKeys.all, 'full-context', visitId, addendum ?? false] as const,
};
