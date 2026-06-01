import type { UseCaseResult } from "./bill.types.js";

export type TariffMasterRow = {
  id: string;
  iq_tenant_id: string;
  service_code: string;
  service_name: string;
  description: string | null;
  provider_id: string | null;
  department_id: string | null;
  consultation_type_id: string | null;
  department: string | null;
  category: string | null;
  sub_category: string | null;
  tax_type: string | null;
  base_price: string;
  tax_percentage: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type UpdateTariffServiceInput = {
  service_name?: string;
  description?: string | null;
  department?: string | null;
  category?: string | null;
  sub_category?: string | null;
  tax_type?: string | null;
  base_price?: string | number;
  tax_percentage?: string | number;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string | null;
};

export type UpdateTariffServiceResult = UseCaseResult<TariffMasterRow>;
