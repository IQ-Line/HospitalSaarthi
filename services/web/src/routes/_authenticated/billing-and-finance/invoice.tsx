import { createFileRoute } from '@tanstack/react-router';
import { BillingPageShell } from '@/features/billing/components/billing-page-shell';

export const Route = createFileRoute('/_authenticated/billing-and-finance/invoice')({
  component: BillingInvoicePage,
});

function BillingInvoicePage() {
  return (
    <BillingPageShell
      title="Invoice"
      description="Patient invoices and billing documents. UI wiring is in progress."
    >
      <p className="text-sm text-muted-foreground">
        Requires <code className="text-xs">invoice:invoice:read</code> from the Master Data catalog.
      </p>
    </BillingPageShell>
  );
}
