import { useEffect, useState } from 'react';
import { InventoryMastersTabPage } from '@/features/inventory-masters/components/inventory-masters-tab-page';
import { useFilteredInventoryMasterTabs } from '@/features/inventory-masters/hooks/use-filtered-inventory-master-tabs';
import type { InventoryMasterTabId } from '@/features/inventory-masters/types';

/**
 * Inventory & Supply Masters embedded in Onboarding → tenant detail tabs.
 * Relies on the active facility tenant already set when this page is opened.
 */
export function TenantInventoryMastersPanel() {
  const visibleTabs = useFilteredInventoryMasterTabs();
  const [tabId, setTabId] = useState<InventoryMasterTabId>('item-master');

  useEffect(() => {
    if (visibleTabs.length === 0) {
      return;
    }
    if (!visibleTabs.some((tab) => tab.id === tabId)) {
      setTabId(visibleTabs[0]!.id);
    }
  }, [visibleTabs, tabId]);

  if (visibleTabs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No inventory master tabs are available for this tenant.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Inventory &amp; Supply Masters</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure inventory reference data for this facility tenant.
        </p>
      </div>
      <InventoryMastersTabPage tabId={tabId} embedded onTabChange={setTabId} />
    </div>
  );
}
