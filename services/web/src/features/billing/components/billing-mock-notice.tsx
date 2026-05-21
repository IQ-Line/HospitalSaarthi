import { billingUseMock } from '@/features/billing/api/tariff-client';

export function BillingMockNotice() {
  if (!billingUseMock) return null;
  return (
    <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
      Showing sample catalog data in the browser (no API). Set{' '}
      <code className="text-xs">VITE_BILLING_USE_MOCK=false</code> to call billing-svc.
    </p>
  );
}
