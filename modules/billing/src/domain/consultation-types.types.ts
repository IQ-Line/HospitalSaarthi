export type ConsultationTypeRow = {
  id: string;
  iq_tenant_id: string;
  code: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_CONSULTATION_TYPE_CODE = "GENERAL_CONSULTATION" as const;
