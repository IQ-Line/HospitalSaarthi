import { createFileRoute } from '@tanstack/react-router';
import { Suspense, useState } from 'react';
import { Button } from '@pulse/ui/button';
import { CapabilityGate } from '@/components/capability-gate';
import { PageHeader } from '@/components/page-header';
import { IH_INTEGRATION_CREATE } from '@/lib/runtime-capability-keys';
import {
  integrationListOptions,
  integrationTypeCatalogOptions,
  useIntegrationListSuspense,
} from '@/features/integration-hub/api/queries';
import { CreateIntegrationDialog } from '@/features/integration-hub/components/create-integration-dialog';
import { IntegrationListTable } from '@/features/integration-hub/components/integration-list-table';

export const Route = createFileRoute('/_authenticated/integration-hub/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(integrationListOptions()),
      context.queryClient.ensureQueryData(integrationTypeCatalogOptions()),
    ]);
  },
  component: IntegrationHubIndexPage,
});

function IntegrationHubIndexPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Partner integrations"
        description="Register partner systems, activate principals, and issue API keys for inbound access."
        actions={
          <CapabilityGate capability={IH_INTEGRATION_CREATE}>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New integration
            </Button>
          </CapabilityGate>
        }
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <IntegrationListSection />
      </Suspense>
      {createOpen ? (
        <Suspense fallback={null}>
          <CreateIntegrationDialog open={createOpen} onOpenChange={setCreateOpen} />
        </Suspense>
      ) : null}
    </div>
  );
}

function IntegrationListSection() {
  const { data } = useIntegrationListSuspense();
  return <IntegrationListTable items={data.items} />;
}
