import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pulse/ui/breadcrumb';
import { PageHeader } from '@/components/page-header';
import { useFilteredInventoryMasterTabs } from '@/features/inventory-masters/hooks/use-filtered-inventory-master-tabs';
import {
  INVENTORY_MASTER_PAGE_TITLE,
} from '@/features/inventory-masters/inventory-masters-nav-model';
import type { InventoryMasterTabConfig } from '@/features/inventory-masters/inventory-masters-nav-model';
import type { InventoryMasterTabId } from '@/features/inventory-masters/types';

interface InventoryMastersPageShellProps {
  tabId: InventoryMasterTabId;
  actions?: ReactNode;
  children: ReactNode;
  /**
   * Controlled/embedded mode (tenant Onboarding detail tabs). Uses buttons instead of
   * router Links and omits the standalone page chrome.
   */
  embedded?: boolean;
  onTabChange?: (tabId: InventoryMasterTabId) => void;
}

function isTabActive(pathname: string, tab: InventoryMasterTabConfig): boolean {
  return pathname === tab.route || pathname.startsWith(`${tab.route}/`);
}

const tabClass = (active: boolean) =>
  active
    ? 'inline-flex h-9 items-center whitespace-nowrap border-b-2 border-foreground px-3 text-sm font-semibold text-foreground'
    : 'inline-flex h-9 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm text-foreground/70 transition-colors hover:text-foreground';

export function InventoryMastersPageShell({
  tabId,
  actions,
  children,
  embedded = false,
  onTabChange,
}: InventoryMastersPageShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const visibleTabs = useFilteredInventoryMasterTabs();
  const activeTab =
    visibleTabs.find((tab) => tab.id === tabId) ?? visibleTabs[0];

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-4 p-6'}>
      {embedded ? null : (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{INVENTORY_MASTER_PAGE_TITLE}</BreadcrumbPage>
            </BreadcrumbItem>
            {activeTab ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeTab.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {embedded ? (
        actions ? <div className="flex justify-end">{actions}</div> : null
      ) : (
        <PageHeader title={INVENTORY_MASTER_PAGE_TITLE} actions={actions} />
      )}

      <div className="border-b">
        <nav className="-mb-px flex items-center gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const active = embedded
              ? tab.id === (activeTab?.id ?? tabId)
              : isTabActive(pathname, tab);
            if (embedded && onTabChange) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={tabClass(active)}
                >
                  {tab.label}
                </button>
              );
            }
            return (
              <Link key={tab.id} to={tab.route} className={tabClass(active)}>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
