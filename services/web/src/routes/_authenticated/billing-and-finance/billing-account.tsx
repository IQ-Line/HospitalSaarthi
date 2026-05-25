import { createFileRoute } from '@tanstack/react-router';
import { BillingPageShell } from '@/features/billing/components/billing-page-shell';

export const Route = createFileRoute('/_authenticated/billing-and-finance/billing-account')({
  component: BillingAccountPage,
});

function BillingAccountPage() {
  return (
    <BillingPageShell
      title="Billing account"
      description="Patient billing accounts and balances. UI wiring is in progress."
    >
      <p className="text-sm text-muted-foreground">
        Requires <code className="text-xs">billing-account:billing-account:read</code> from the
        Master Data catalog.
      </p>
    </BillingPageShell>
  );
}
