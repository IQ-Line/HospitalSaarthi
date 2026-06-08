import { Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import { CreateIntegrationDialog } from '@/features/integration-hub/components/create-integration-dialog';
import { IntegrationDetailPanel } from '@/features/integration-hub/components/integration-detail-panel';
import { IntegrationListTable } from '@/features/integration-hub/components/integration-list-table';
import {
  integrationTypeCatalogOptions,
  useIntegrationListSuspense,
} from '@/features/integration-hub/api/queries';

type TenantIntegrationsPanelProps = {
  tenantId: string;
  canEdit: boolean;
};

export function TenantIntegrationsPanel({ tenantId, canEdit }: TenantIntegrationsPanelProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Partner integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Register partner systems, activate principals, and issue API keys for inbound access to
            this tenant.
          </p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            onClick={() => {
              void queryClient.ensureQueryData(integrationTypeCatalogOptions());
              setCreateOpen(true);
            }}
          >
            New integration
          </Button>
        ) : null}
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading integrations…</p>}>
        <TenantIntegrationsList
          tenantId={tenantId}
          selectedIntegrationId={selectedIntegrationId}
          onSelect={setSelectedIntegrationId}
        />
      </Suspense>

      {selectedIntegrationId ? (
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading details…</p>}>
          <IntegrationDetailPanel
            tenantId={tenantId}
            integrationId={selectedIntegrationId}
            canEdit={canEdit}
            onBack={() => setSelectedIntegrationId(null)}
            onDeleted={() => setSelectedIntegrationId(null)}
          />
        </Suspense>
      ) : null}

      {canEdit && createOpen ? (
        <Suspense fallback={null}>
          <CreateIntegrationDialog
            tenantId={tenantId}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function TenantIntegrationsList({
  tenantId,
  selectedIntegrationId,
  onSelect,
}: {
  tenantId: string;
  selectedIntegrationId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data } = useIntegrationListSuspense(tenantId);
  return (
    <IntegrationListTable
      items={data.items}
      selectedIntegrationId={selectedIntegrationId}
      onSelect={onSelect}
    />
  );
}
