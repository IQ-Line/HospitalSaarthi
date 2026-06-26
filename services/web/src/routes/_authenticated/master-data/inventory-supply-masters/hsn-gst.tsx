import { createFileRoute } from '@tanstack/react-router';
import { InventoryMastersTabPage } from '@/features/inventory-masters/components/inventory-masters-tab-page';
import { requireInventoryMasterTabAccess } from '@/lib/inventory-masters-route-access';

export const Route = createFileRoute('/_authenticated/master-data/inventory-supply-masters/hsn-gst')({
  beforeLoad: requireInventoryMasterTabAccess('hsn-gst'),
  component: () => <InventoryMastersTabPage tabId="hsn-gst" />,
});
