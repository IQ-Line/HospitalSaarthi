/** Canonical `source_module` values written on `billing.bill_items`. */
export const BILLING_SOURCE_MODULE = {
  REGISTRATION: 'registration',
} as const;

export type BillingSourceModule =
  (typeof BILLING_SOURCE_MODULE)[keyof typeof BILLING_SOURCE_MODULE];
