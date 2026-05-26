import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pulse/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pulse/ui/tabs';
import { DataTable } from '@/components/data-table';
import {
  useOrganization,
  useTenantModules,
  useTenants,
} from '@/features/configurator/api';
import { CreateBranchWizard } from '@/features/configurator/components/create-branch-wizard';
import { TenantModulesPanel } from '@/features/configurator/components/tenant-modules-panel';
import {
  TenantBillingPanel,
  TenantDepartmentsPanel,
  TenantRoleTemplatesPanel,
  TenantUsersPanel,
} from '@/features/configurator/components/tenant-detail-panels';
import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import {
  buildDescendantBranchTreeRows,
  type TenantTreeRow,
} from '@/features/configurator/tenant-tree';
import type { ConfiguratorTenant } from '@/features/configurator/types';
import { useModules } from '@/features/master-data/api';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@pulse/ui/empty';

export const Route = createFileRoute('/_authenticated/configurator/tenant/$organizationId')({
  validateSearch: (search: Record<string, unknown>) => ({
    tenantId:
      typeof search.tenantId === 'string' && search.tenantId.trim().length > 0
        ? search.tenantId.trim()
        : undefined,
  }),
  component: TenantOrganizationDetailPage,
});

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const branchTypeLabels: Record<string, string> = {
  hub_lab: 'Hub Lab',
  hub: 'Hub',
  satellite: 'Satellite',
};

function provisioningLabel(status: string) {
  if (status === 'provisioning') return 'Pending';
  if (status === 'active') return 'Active';
  if (status === 'suspended') return 'Suspended';
  return status;
}

function TenantTabComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <Empty className="border border-dashed py-12">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{body}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function TenantOrganizationDetailPage() {
  const { organizationId } = Route.useParams();
  const { tenantId: tenantIdFromSearch } = Route.useSearch();
  const [tab, setTab] = useState('overview');
  const [addBranchOpen, setAddBranchOpen] = useState(false);

  const { data: org, isLoading: orgLoading, error: orgError } = useOrganization(organizationId);
  /** List all tenants for the org; detail view is scoped to one tenant (from list eye link or org root). */
  const { data: orgTenantsRes, isLoading: orgTenantsLoading } = useTenants(
    { org_id: organizationId },
    { enabled: !!organizationId },
  );
  const orgTenants = orgTenantsRes?.data ?? [];

  const rootTenant = useMemo(
    () => orgTenants.find((t) => t.parent_tenant_id == null) ?? null,
    [orgTenants],
  );

  const contextTenant = useMemo(() => {
    if (tenantIdFromSearch) {
      const selected = orgTenants.find((t) => t.iq_tenant_id === tenantIdFromSearch);
      if (selected) return selected;
    }
    return rootTenant;
  }, [orgTenants, tenantIdFromSearch, rootTenant]);

  const branchTreeRows = useMemo(() => {
    if (!contextTenant) return [];
    return buildDescendantBranchTreeRows(orgTenants, contextTenant.iq_tenant_id);
  }, [orgTenants, contextTenant]);

  const { data: modulesRes, isLoading: modulesCatalogLoading } = useModules(undefined, {
    enabled: !!contextTenant?.iq_tenant_id,
    globalCatalog: true,
  });
  const { data: tenantModsRes, isLoading: tenantModsLoading } = useTenantModules(
    contextTenant?.iq_tenant_id ?? '',
    {
      enabled:
        !!contextTenant?.iq_tenant_id &&
        (tab === 'overview' || tab === 'modules'),
    },
  );

  const moduleNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mod of modulesRes?.data ?? []) {
      m.set(mod.id, mod.name);
    }
    return m;
  }, [modulesRes?.data]);

  const activeModuleNames = useMemo(() => {
    const rows = tenantModsRes?.data ?? [];
    return rows
      .filter((r) => r.is_active)
      .map((r) => moduleNameById.get(r.module_id) ?? r.module_id.slice(0, 8));
  }, [tenantModsRes?.data, moduleNameById]);

  const planSlug = useMemo(() => {
    const meta = org?.metadata as Record<string, unknown> | null | undefined;
    const prov = meta?.provisioning as Record<string, unknown> | undefined;
    const slug = prov?.plan_slug;
    if (slug === 'professional') return 'Professional Plan';
    if (slug === 'starter') return 'Starter Plan';
    return typeof slug === 'string' ? slug : '—';
  }, [org?.metadata]);

  const branchColumns = useMemo<ColumnDef<TenantTreeRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const depth = row.original.depth ?? 0;
          return (
            <div style={{ paddingLeft: `${depth * 1.25}rem` }} className="min-w-0">
              <span className="font-medium">{row.original.name}</span>
            </div>
          );
        },
      },
      {
        id: 'record_kind',
        header: 'Record',
        cell: () => (
          <Badge variant="secondary" className="text-xs font-normal">
            Branch
          </Badge>
        ),
      },
      {
        accessorKey: 'branch_code',
        header: 'Code',
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          if (v) return <code className="text-xs">{v}</code>;
          return <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'branch_type',
        header: 'Type',
        cell: ({ row }) => {
          const v = row.original.branch_type;
          if (v) {
            return <Badge variant="secondary">{branchTypeLabels[v] ?? v}</Badge>;
          }
          return <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: 'parent_hub',
        header: 'Parent hub',
        cell: ({ row }) => {
          if (row.original.parent_tenant_id == null) {
            return <span className="text-muted-foreground">—</span>;
          }
          const meta = row.original.metadata as Record<string, unknown> | null;
          const hub = meta?.parent_hub;
          return typeof hub === 'string' ? hub : '—';
        },
      },
      {
        accessorKey: 'city',
        header: 'City',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'provisioning_status',
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue<string>();
          const active = s === 'active';
          return (
            <Badge variant={active ? 'default' : 'secondary'}>{provisioningLabel(s)}</Badge>
          );
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Last updated',
        cell: ({ getValue }) => formatShortDate(getValue<string>()),
      },
    ],
    [],
  );

  const catalogModules = useMemo(
    () => (modulesRes?.data ?? []).filter((mod) => !mod.is_deleted),
    [modulesRes?.data],
  );

  const accessToken = useAuthStore((s) => s.accessToken);
  const canEditTenantModules = isPlatformSuperAdminFromAccessToken(accessToken);

  if (orgError) {
    return (
      <div className="p-6 text-destructive">
        Failed to load organization: {orgError.message}
      </div>
    );
  }

  if (orgLoading || !org) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (orgTenantsLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading tenant…</div>;
  }

  if (!contextTenant) {
    const tenantCount = orgTenantsRes?.data?.length ?? 0;
    return (
      <div className="p-6 max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Back to list">
            <Link to="/configurator/tenant">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{org.name}</h1>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            This organization has no default (root) environment in the configurator database
            {tenantCount > 0
              ? ` — ${tenantCount} tenant row(s) exist but every row has a parent tenant, so none is treated as the org root.`
              : ' — there are no tenant rows for this organization yet.'}
          </p>
          <p className="text-muted-foreground">
            Provision a root tenant from the tenant list (Create tenant wizard), or add a root tenant
            row in the database for legacy organisations.
          </p>
          <ReadOnlyRow label="Slug" value={org.slug} />
          <ReadOnlyRow label="Organization ID" value={org.id} />
        </div>
        <Button variant="outline" asChild>
          <Link to="/configurator/tenant">Back to tenants</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Configurator</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/configurator/tenant">Tenant</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[12rem] truncate">{contextTenant.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" asChild aria-label="Back to list">
              <Link to="/configurator/tenant">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">{contextTenant.name}</h1>
          </div>
          {contextTenant.parent_tenant_id ? (
            <p className="pl-10 text-xs text-muted-foreground">
              Branch under {org.name}
            </p>
          ) : null}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList
            variant="line"
            className="inline-flex h-auto min-w-max flex-nowrap justify-start gap-1 bg-transparent p-0"
          >
            <TabsTrigger value="overview" className="shrink-0 text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="branches" className="shrink-0 text-xs sm:text-sm">
              Branches
            </TabsTrigger>
            <TabsTrigger value="users" className="shrink-0 text-xs sm:text-sm">
              Users
            </TabsTrigger>
            <TabsTrigger value="role-templates" className="shrink-0 text-xs sm:text-sm">
              Role Templates
            </TabsTrigger>
            <TabsTrigger value="department-templates" className="shrink-0 text-xs sm:text-sm">
              Department templates
            </TabsTrigger>
            <TabsTrigger value="billing" className="shrink-0 text-xs sm:text-sm">
              Billing
            </TabsTrigger>
            <TabsTrigger value="modules" className="shrink-0 text-xs sm:text-sm">
              Modules
            </TabsTrigger>
            <TabsTrigger value="audit-logs" className="shrink-0 text-xs sm:text-sm">
              Audit logs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="max-w-2xl space-y-3 text-sm">
            <ReadOnlyRow label="Organization" value={org.name} />
            <ReadOnlyRow label="Slug" value={`${org.slug}.iqhealth.app`} />
            <ReadOnlyRow label="Plan" value={planSlug} />
            <ReadOnlyRow
              label="Status"
              value={provisioningLabel(contextTenant.provisioning_status)}
            />
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Modules enabled</div>
              <div className="flex flex-wrap gap-1">
                {activeModuleNames.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  activeModuleNames.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs font-normal">
                      {name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="grid gap-3 border-t pt-3 sm:grid-cols-3">
              <ReadOnlyRow label="Total users" value="—" />
              <ReadOnlyRow
                label="Active branches"
                value={orgTenantsLoading ? '…' : String(branchTreeRows.length)}
              />
              <ReadOnlyRow label="Monthly test volume" value="—" />
            </div>
            <ReadOnlyRow label="Created" value={formatShortDate(org.created_at)} />
            <ReadOnlyRow label="Updated" value={formatShortDate(org.updated_at)} />
          </div>
        </TabsContent>

        <TabsContent value="branches" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-[#008C9E] text-white hover:bg-[#00798a]"
              onClick={() => setAddBranchOpen(true)}
            >
              + Add branch
            </Button>
          </div>
          <div className="rounded-lg border">
            <DataTable
              columns={branchColumns}
              data={branchTreeRows}
              isLoading={orgTenantsLoading}
              emptyTitle="No branches yet"
              emptyDescription="Use Add branch to create nested branches under this tenant."
            />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <TenantUsersPanel
            iqTenantId={contextTenant.iq_tenant_id}
            organizationId={org.id}
          />
        </TabsContent>

        <TabsContent value="role-templates" className="mt-4">
          <TenantRoleTemplatesPanel iqTenantId={contextTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="department-templates" className="mt-4">
          <TenantDepartmentsPanel iqTenantId={contextTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <TenantBillingPanel iqTenantId={contextTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <TenantModulesPanel
            iqTenantId={contextTenant.iq_tenant_id}
            catalogModules={catalogModules}
            tenantModules={tenantModsRes?.data ?? []}
            isLoading={modulesCatalogLoading || tenantModsLoading}
            canEditModules={canEditTenantModules}
          />
        </TabsContent>

        <TabsContent value="audit-logs" className="mt-4">
          <TenantTabComingSoon
            title="Audit logs"
            body="Immutable audit trails for this tenant are not exposed via master-data. This will link to an audit service when available."
          />
        </TabsContent>
      </Tabs>

      <CreateBranchWizard
        open={addBranchOpen}
        onOpenChange={setAddBranchOpen}
        organizationId={organizationId}
        organizationSlug={org.slug}
        parentTenantId={contextTenant.iq_tenant_id}
        parentTenantName={contextTenant.name}
      />
    </div>
  );
}
