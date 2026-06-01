import type { TariffMasterRepo } from "../ports.js";

/** Minimal no-op stubs for TariffMasterRepo methods not under test. */
export const noopTariffRepoMethods: Pick<
  TariffMasterRepo,
  | "findByCodeAndProvider"
  | "resolveConsultationTariff"
  | "upsertProviderConsultationTariff"
  | "listProviderConsultationTariffs"
  | "hasOverlappingConsultationTariff"
  | "bulkUpsertProviderConsultationTariffs"
> = {
  findByCodeAndProvider: async () => undefined,
  resolveConsultationTariff: async () => undefined,
  upsertProviderConsultationTariff: async () => {
    throw new Error("not implemented");
  },
  listProviderConsultationTariffs: async () => [],
  hasOverlappingConsultationTariff: async () => false,
  bulkUpsertProviderConsultationTariffs: async () => {
    throw new Error("not implemented");
  },
};
