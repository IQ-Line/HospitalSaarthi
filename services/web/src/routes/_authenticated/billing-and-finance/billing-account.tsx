import { createFileRoute } from '@tanstack/react-router';
import { BillingPageShell } from '@/features/billing/components/billing-page-shell';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';

export const Route = createFileRoute('/_authenticated/billing-and-finance/billing-account')({
  component: BillingAccountPage,
});

function BillingAccountPage() {
  const { canRead } = useCatalogModuleCrud('billing-account', {
    productModuleSlug: 'billing-and-finance',
  });

  return (
    <BillingPageShell
      title="Billing account"
      description="Patient billing accounts and balances. UI wiring is in progress."
    >
      {canRead ? (
        <p className="text-sm text-muted-foreground">
          Billing accounts UI wiring is in progress.
        </p>
      ) : null}
    </BillingPageShell>
  );
}
