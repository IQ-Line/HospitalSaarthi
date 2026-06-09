import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@pulse/ui/badge';
import { Switch } from '@pulse/ui/switch';
import { DataTable } from '@/components/data-table';
import {
  useSetTenantModuleActive,
  type TenantModuleRow,
} from '@/features/configurator/api/tenants';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import type { Module } from '@/features/master-data/types';
import { toast } from 'sonner';

export function TenantModulesPanel({
  iqTenantId,
  catalogModules,
  tenantModules,
  isLoading,
  canEditModules,
}: {
  iqTenantId: string;
  catalogModules: Module[];
  tenantModules: TenantModuleRow[];
  isLoading: boolean;
  canEditModules: boolean;
}) {
  const setModuleActive = useSetTenantModuleActive();
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);

  const tenantModuleById = useMemo(() => {
    const m = new Map<string, TenantModuleRow>();
    for (const row of tenantModules) {
      m.set(row.module_id, row);
    }
    return m;
  }, [tenantModules]);

  const columns = useMemo<ColumnDef<Module, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Module',
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        id: 'for_tenant',
        header: () => (
          <div className="text-right">
            {canEditModules ? 'Enabled' : 'Enabled for tenant'}
          </div>
        ),
        cell: ({ row }) => {
          const moduleId = row.original.id;
          const tenantRow = tenantModuleById.get(moduleId);
          const enabled = tenantRow?.is_active === true;
          const lockedOn = Boolean(tenantRow?.is_core_override && tenantRow.is_active);

          if (!canEditModules) {
            return (
              <div className="text-right">
                <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? 'Yes' : 'No'}</Badge>
              </div>
            );
          }

          const busy = pendingModuleId === moduleId || setModuleActive.isPending;

          return (
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">{enabled ? 'On' : 'Off'}</span>
              <Switch
                checked={enabled}
                disabled={busy || lockedOn}
                aria-label={`${enabled ? 'Disable' : 'Enable'} ${row.original.name}`}
                onCheckedChange={(checked) => {
                  setPendingModuleId(moduleId);
                  setModuleActive.mutate(
                    {
                      tenantId: iqTenantId,
                      moduleId,
                      isActive: checked,
                      existingRow: tenantRow,
                    },
                    {
                      onSuccess: () => {
                        toast.success(
                          checked
                            ? `${row.original.name} enabled for this tenant`
                            : `${row.original.name} disabled for this tenant`,
                        );
                      },
                      onError: (err) => {
                        toast.error(mutationErrorMessage(err));
                      },
                      onSettled: () => {
                        setPendingModuleId(null);
                      },
                    },
                  );
                }}
              />
            </div>
          );
        },
      },
    ],
    [canEditModules, iqTenantId, pendingModuleId, setModuleActive, tenantModuleById],
  );

  return (
    <div className="space-y-3">
      {canEditModules ? (
        <p className="text-xs text-muted-foreground">
          Enable or disable L1 product modules for this tenant. Child features (L2/L3) inherit the
          parent — use L1 toggles only. Core modules marked as always-on cannot be disabled.
        </p>
      ) : null}
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={catalogModules}
          isLoading={isLoading}
          emptyTitle="No modules in catalog"
          emptyDescription="Add modules under Master data → Modules."
        />
      </div>
    </div>
  );
}
