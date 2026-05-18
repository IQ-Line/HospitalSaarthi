import type {
  TariffMasterRow,
  UpdateTariffServiceInput,
} from "./domain/tariff-master.types.js";

/** Patch accepted by repositories after use-case validation (dates may be parsed). */
export type TariffMasterUpdatePatch = Omit<
  UpdateTariffServiceInput,
  "effective_from" | "effective_to"
> & {
  effective_from?: Date | string;
  effective_to?: Date | string | null;
  updated_by?: string | null;
};

export interface TariffMasterRepo {
  findById(tenantId: string, id: string): Promise<TariffMasterRow | undefined>;
  update(
    tenantId: string,
    id: string,
    patch: TariffMasterUpdatePatch,
  ): Promise<TariffMasterRow | undefined>;
}
