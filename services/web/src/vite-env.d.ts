/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CERBOS_URL?: string;
  readonly VITE_DEFAULT_IQ_TENANT_ID?: string;
  readonly VITE_REGISTRATION_SERVICE_ORIGIN?: string;
  readonly VITE_ABDM_ADAPTER_ORIGIN?: string;
  readonly VITE_CREATE_RX_USE_MOCK?: string;
  readonly VITE_OPD_PATIENTS_USE_MOCK?: string;
  readonly VITE_IPD_USE_MOCK?: string;
}
