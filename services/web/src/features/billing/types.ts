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
  department_id?: string | null;
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

export type BillStatus =
  | 'DRAFT'
  | 'FINALIZED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REPLACED';

export type Bill = {
  id: string;
  iq_tenant_id: string;
  bill_number: string;
  patient_id: string;
  visit_id: string | null;
  visit_type: string | null;
  bill_type: string;
  bill_date: string;
  subtotal: string;
  discount_amount: string;
  discount_reason: string | null;
  tax_amount: string;
  total_amount: string;
  round_off_amount: string;
  net_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  status: BillStatus;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type BillsListResponse = {
  data: Bill[];
  page: { limit: number; next_cursor: string | null };
};

export type BillsListParams = {
  patient_id?: string;
  visit_id?: string;
  status?: BillStatus;
  bill_type?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  cursor?: string;
};
