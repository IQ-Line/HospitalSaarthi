import { createFileRoute } from '@tanstack/react-router';
import { InventoryMastersTabPage } from '@/features/inventory-masters/components/inventory-masters-tab-page';
import { requireInventoryMasterTabAccess } from '@/lib/inventory-masters-route-access';

export const Route = createFileRoute('/_authenticated/inventory-supply-masters/item-master')({
  beforeLoad: requireInventoryMasterTabAccess('item-master'),
  component: () => <InventoryMastersTabPage tabId="item-master" />,
});
