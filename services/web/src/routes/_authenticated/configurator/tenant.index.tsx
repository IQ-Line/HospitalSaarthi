import { createFileRoute, Link } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Eye, GitBranch, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { DataTable } from '@/components/data-table';
import { useOrganization, useProvisionTenant, useTenants } from '@/features/configurator/api';
import type { TenantOnboardingInput } from '@/features/configurator/api/tenant-onboarding';
import { CreateTenantWizard } from '@/features/configurator/components/create-tenant-wizard';
import { CreateBranchWizard } from '@/features/configurator/components/create-branch-wizard';
import { ConfiguratorPageShell } from '@/features/configurator/components/configurator-page-shell';
import { useScopedOrganizationId } from '@/features/configurator/hooks/use-scoped-organization-id';
import {
  buildTenantTreeRows,
  filterTenantsToSubtree,
  type TenantTreeRow,
} from '@/features/configurator/tenant-tree';
import type { ConfiguratorTenant, ConfiguratorTenantType } from '@/features/configurator/types';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
import { resolvePlatformSuperAdmin } from '@/lib/platform-admin';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import { useCatalogModuleAction } from '@/hooks/use-catalog-module-action';

export const Route = createFileRoute('/_authenticated/configurator/tenant/')({
  beforeLoad: requireCatalogRouteAccess('/configurator/tenant', {
    catalogModuleSlug: 'tenant-modules',
    catalogProductSlugs: ['configurator'],
    routePrefix: '/configurator',
  }),
  component: ConfiguratorTenantListPage,
});

const tenantTypeLabels: Record<ConfiguratorTenantType, string> = {
  full_platform: 'Full platform',
  fragmented: 'Fragmented',
  lite: 'Lite',
};

const provisioningStatusLabels: Record<string, string> = {
  provisioning: 'Provisioning',
  active: 'Active',
  suspended: 'Suspended',
  decommissioned: 'Decommissioned',
};

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'active') return 'default';
  if (status === 'provisioning') return 'secondary';
  if (status === 'suspended') return 'destructive';
  return 'outline';
}

function ConfiguratorTenantListPage() {
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [branchWizardParent, setBranchWizardParent] = useState<ConfiguratorTenant | null>(null);
  const canCreateTenant = useCatalogModuleAction('tenants', 'create');
  const accessToken = useAuthStore((s) => s.accessToken);
  const authRoles = useAuthStore((s) => s.roles);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const isPlatformSuperAdmin = resolvePlatformSuperAdmin({ authRoles, accessToken });

  const { organizationId, organizationName, isResolving } = useScopedOrganizationId();
  const { data: scopedOrg } = useOrganization(organizationId ?? '', {
    enabled: !!organizationId,
  });

  const listFilters = useMemo(
    () => ({
      org_id: organizationId,
      provisioning_status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    [organizationId, statusFilter],
  );

  const { data, isLoading, error } = useTenants(listFilters, {
    enabled: !!organizationId,
  });
  const allTenants = data?.data ?? [];
  const tenantsForList = useMemo(() => {
    if (isPlatformSuperAdmin || !activeTenantId?.trim()) {
      return allTenants;
    }
    return filterTenantsToSubtree(allTenants, activeTenantId.trim());
  }, [allTenants, activeTenantId, isPlatformSuperAdmin]);

  const treeRootTenantId = useMemo(() => {
    if (isPlatformSuperAdmin || !activeTenantId?.trim()) {
      return null;
    }
    return activeTenantId.trim();
  }, [activeTenantId, isPlatformSuperAdmin]);

  const tenantTreeRows = useMemo(
    () => buildTenantTreeRows(tenantsForList, { rootTenantId: treeRootTenantId }),
    [tenantsForList, treeRootTenantId],
  );

  const provisionMutation = useProvisionTenant();

  const filteredTenants = useMemo(() => {
    return tenantTreeRows.filter((t) =>
      rowMatchesSearch(
        tableSearch,
        t.name,
        t.slug,
        t.type,
        t.provisioning_status,
        t.branch_code ?? '',
        t.contact_email ?? '',
      ),
    );
  }, [tenantTreeRows, tableSearch]);

  const columns = useMemo<ColumnDef<TenantTreeRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tenant',
        cell: ({ row }) => {
          const depth = row.original.depth;
          const pad = depth * 1.75;
          return (
            <div style={{ paddingLeft: `${pad}rem` }} className="min-w-0">
              <div className="flex items-center gap-2">
                {depth > 0 ? (
                  <GitBranch className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                ) : null}
                <div className="min-w-0">
                  <div className={depth > 0 ? 'font-medium text-sm' : 'font-medium'}>
                    {row.original.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{row.original.slug}</div>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        id: 'level',
        header: 'Level',
        cell: ({ row }) =>
          row.original.parent_tenant_id ? (
            <Badge variant="outline">
              Branch{row.original.branch_code ? ` · ${row.original.branch_code}` : ''}
            </Badge>
          ) : (
            <Badge variant="secondary">Root</Badge>
          ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => {
          const t = getValue<ConfiguratorTenantType>();
          return <Badge variant="secondary">{tenantTypeLabels[t] ?? t}</Badge>;
        },
      },
      {
        accessorKey: 'provisioning_status',
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue<string>();
          return (
            <Badge variant={statusBadgeVariant(s)}>
              {provisioningStatusLabels[s] ?? s}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'contact_email',
        header: 'Contact',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.contact_email ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        cell: ({ getValue }) => (
          <span className="text-sm">{formatShortDate(getValue<string>())}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const tenant = row.original;
          const isChildRowInTree = row.original.depth > 0;
          const showTenantUserChildActions = isPlatformSuperAdmin || !isChildRowInTree;

          return (
            <div className="flex items-center justify-end gap-1">
              {canCreateTenant && showTenantUserChildActions ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Add branch"
                  title="Add child branch"
                  onClick={() => setBranchWizardParent(tenant)}
                >
                  <GitBranch className="size-4" />
                </Button>
              ) : null}
              {showTenantUserChildActions ? (
                <>
                  <Button variant="ghost" size="icon-sm" asChild aria-label="View tenant">
                    <Link
                      to="/configurator/tenant/$organizationId"
                      params={{ organizationId: tenant.org_id }}
                      search={{ tenantId: tenant.iq_tenant_id }}
                    >
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon-sm" asChild aria-label="Edit tenant">
                    <Link
                      to="/configurator/tenant/$organizationId"
                      params={{ organizationId: tenant.org_id }}
                      search={{ tenantId: tenant.iq_tenant_id }}
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canCreateTenant, isPlatformSuperAdmin],
  );

  const onCreateWizardComplete = async (input: TenantOnboardingInput) => {
    try {
      await provisionMutation.mutateAsync(input);
      toast.success('Tenant and administrator created successfully');
      setIsCreateOpen(false);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  };

  if (!organizationId && !isResolving) {
    return (
      <div className="p-6 text-muted-foreground">
        No organisation scope is available. Select an organisation in the header or sign in again.
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load tenants: {error.message}
      </div>
    );
  }

  const scopeTitle = organizationName ? `Tenants · ${organizationName}` : 'Tenants';

  return (
    <ConfiguratorPageShell
      section="tenant"
      title={scopeTitle}
      description={
        isPlatformSuperAdmin
          ? 'Tenants and branches for your current organisation. Indented rows are child branches; use Add branch on any row to nest further.'
          : 'Your tenant and its child branches only. Use Add branch on a row to create nested branches under it.'
      }
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="provisioning">Provisioning</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="decommissioned">Decommissioned</SelectItem>
            </SelectContent>
          </Select>
          {canCreateTenant ? (
            <Button onClick={() => setIsCreateOpen(true)}>+ Create Tenant</Button>
          ) : null}
        </div>
      }
    >
      <div className="rounded-lg border">
        <div className="p-3 border-b">
          <MasterDataTableToolbar
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search name, slug, type, status, contact…"
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredTenants}
          isLoading={isLoading || isResolving}
          emptyTitle={
            isPlatformSuperAdmin ? 'No tenants in this organisation' : 'No branches under your tenant'
          }
          emptyDescription={
            isPlatformSuperAdmin
              ? 'Create a tenant to provision a new environment under this organisation.'
              : 'Add a branch from the actions menu on your tenant row.'
          }
        />
      </div>

      <CreateTenantWizard
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        isSubmitting={provisionMutation.isPending}
        onComplete={onCreateWizardComplete}
        defaultOrganizationId={organizationId}
      />

      {branchWizardParent && organizationId ? (
        <CreateBranchWizard
          open={!!branchWizardParent}
          onOpenChange={(open) => {
            if (!open) setBranchWizardParent(null);
          }}
          organizationId={organizationId}
          organizationSlug={scopedOrg?.slug ?? ''}
          parentTenantId={branchWizardParent.iq_tenant_id}
          parentTenantName={branchWizardParent.name}
        />
      ) : null}
    </ConfiguratorPageShell>
  );
}
