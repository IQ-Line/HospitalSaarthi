export const visitpadKeys = {
  all: ['visitpad'] as const,
  units: () => [...visitpadKeys.all, 'units'] as const,
  conversions: () => [...visitpadKeys.all, 'conversions'] as const,
  vitals: () => [...visitpadKeys.all, 'vitals'] as const,
  chiefComplaints: () => [...visitpadKeys.all, 'chief-complaints'] as const,
  diagnoses: () => [...visitpadKeys.all, 'diagnoses'] as const,
  allergens: () => [...visitpadKeys.all, 'allergens'] as const,
  reactions: () => [...visitpadKeys.all, 'reactions'] as const,
  rxColumns: (section?: string) =>
    [...visitpadKeys.all, 'rx-columns', section ?? 'all'] as const,
  medicines: () => [...visitpadKeys.all, 'medicines'] as const,
  chronicIllnesses: () => [...visitpadKeys.all, 'chronic-illnesses'] as const,
  procedures: () => [...visitpadKeys.all, 'procedures'] as const,
};
