import { useNavigate } from '@tanstack/react-router';
import { PageHeaderWithBack } from '@pulse/patterns/page-header-with-back';
import type { InventoryOperationalVariant } from '../lib/inventory-operational-variant';
import { operationalTransfersPath } from '../lib/inventory-operational-variant';
import { InventoryPageShell } from './inventory-page-shell';
import { InventoryTransferDialog } from './inventory-transfer-dialog';

type InventoryTransferFormPageProps = {
  variant?: InventoryOperationalVariant;
};

export function InventoryTransferFormPage({ variant = 'inventory' }: InventoryTransferFormPageProps) {
  const navigate = useNavigate();
  const transfersPath = operationalTransfersPath(variant);

  return (
    <InventoryPageShell
      title="New transfer"
      breadcrumbLabel="New"
      variant={variant}
      breadcrumbs={[
        {
          label: 'Transfers',
          to: transfersPath,
        },
        { label: 'New' },
      ]}
    >
      <PageHeaderWithBack
        title="New transfer"
        backButton={{ href: transfersPath }}
        className="-mt-2 mb-4"
      />
      <InventoryTransferDialog
        open
        onOpenChange={(open) => {
          if (!open) {
            void navigate({ to: transfersPath });
          }
        }}
        transfer={null}
        variant={variant}
      />
    </InventoryPageShell>
  );
}
