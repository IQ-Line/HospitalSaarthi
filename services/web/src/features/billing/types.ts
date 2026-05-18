export type TariffService = {
  id: string;
  iq_tenant_id: string;
  service_code: string;
  service_name: string;
  description: string | null;
  provider_id: string | null;
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

export type ServicesListResponse = {
  data: TariffService[];
  page: { limit: number; next_cursor: string | null };
};

export type ServiceSingleResponse = { data: TariffService };

export type ServiceCreateInput = {
  service_code: string;
  service_name: string;
  base_price: string | number;
  tax_percentage?: string | number;
  description?: string | null;
  provider_id?: string | null;
  department?: string | null;
  category?: string | null;
  sub_category?: string | null;
  tax_type?: string | null;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string | null;
};

export type ServiceUpdateInput = {
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

export type ServicesListParams = {
  q?: string;
  category?: string;
  department?: string;
  is_active?: boolean;
  limit?: number;
  cursor?: string;
};
