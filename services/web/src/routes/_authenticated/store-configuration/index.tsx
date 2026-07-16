import { createFileRoute } from '@tanstack/react-router';
import { StoreConfigurationPanel } from '@/features/store-configuration/components/store-configuration-panel';
import { requireStoreConfigurationAccess } from '@/lib/store-configuration-route-access';

export const Route = createFileRoute('/_authenticated/store-configuration/')({
  beforeLoad: requireStoreConfigurationAccess(),
  component: StoreConfigurationPage,
});

function StoreConfigurationPage() {
  return <StoreConfigurationPanel />;
}
