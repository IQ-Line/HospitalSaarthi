/// <reference types="vite/client" />

interface ImportMetaEnv {  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CERBOS_URL?: string;
  readonly VITE_DEFAULT_IQ_TENANT_ID?: string;
  readonly VITE_REGISTRATION_SERVICE_ORIGIN?: string;
  readonly VITE_ABDM_ADAPTER_ORIGIN?: string;
  readonly VITE_CREATE_RX_USE_MOCK?: string;
  readonly VITE_OPD_PATIENTS_USE_MOCK?: string;
  /** When `ON`, authenticated routes try page-builder resolve before legacy route UI. */
  readonly VITE_LC_NC?: string;
  /** Page/form builder client scope (same as SMS Studio). */
  readonly VITE_CLIENT_ID?: string;
  /** Form + page + workflow builder API origin (e.g. workflow-backend). */
  readonly VITE_FORM_WORKFLOW_BUILDER_URL?: string;
  /** Business API origin for form field prepopulate/select URLs; defaults to VITE_API_BASE_URL. */
  readonly VITE_BUSINESS_API_BASE?: string;
}
