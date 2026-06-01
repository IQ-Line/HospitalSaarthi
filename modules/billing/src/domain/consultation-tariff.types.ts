import type { TariffMasterRow } from "./tariff-master.types.js";

export type ProviderConsultationTariffItemInput = {
  department_id: string;
  consultation_type_id: string;
  base_price: string | number;
  tax_percentage?: string | number;
};

export type BulkUpsertProviderConsultationTariffsInput = {
  provider_id: string;
  items: ProviderConsultationTariffItemInput[];
};

export type ListProviderConsultationTariffsQuery = {
  provider_id?: string;
  department_id?: string;
  consultation_type_id?: string;
};

export type ProviderConsultationTariffView = Pick<
  TariffMasterRow,
  | "id"
  | "provider_id"
  | "department_id"
  | "consultation_type_id"
  | "service_code"
  | "service_name"
  | "department"
  | "base_price"
  | "tax_percentage"
  | "is_active"
  | "effective_from"
  | "effective_to"
>;
