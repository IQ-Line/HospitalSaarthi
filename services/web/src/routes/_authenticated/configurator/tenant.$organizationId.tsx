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
import { AddBranchDialog } from '@/features/configurator/components/add-branch-dialog';
import {
  TenantBillingPanel,
  TenantDepartmentsPanel,
  TenantRoleTemplatesPanel,
  TenantUsersPanel,
} from '@/features/configurator/components/tenant-detail-panels';
import type { ConfiguratorTenant } from '@/features/configurator/types';
import { useModules } from '@/features/master-data/api';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import type { Module } from '@/features/master-data/types';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@pulse/ui/empty';

export const Route = createFileRoute('/_authenticated/configurator/tenant/$organizationId')({
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

function OverviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(10rem,14rem)_1fr] items-center gap-x-6 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
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
  const [tab, setTab] = useState('overview');
  const [addBranchOpen, setAddBranchOpen] = useState(false);

  const { data: org, isLoading: orgLoading, error: orgError } = useOrganization(organizationId);
  /** List all tenants for the org, then pick root client-side (avoids brittle is_root-only queries). */
  const { data: orgTenantsRes, isLoading: orgTenantsLoading } = useTenants(
    { org_id: organizationId },
    { enabled: !!organizationId },
  );
  const rootTenant = useMemo(() => {
    const rows = orgTenantsRes?.data ?? [];
    return rows.find((t) => t.parent_tenant_id == null) ?? null;
  }, [orgTenantsRes?.data]);

  const { data: branchesRes, isLoading: branchesLoading } = useTenants(
    {
      org_id: organizationId,
      parent_tenant_id: rootTenant?.iq_tenant_id,
    },
    { enabled: !!organizationId && !!rootTenant?.iq_tenant_id },
  );

  const { data: modulesRes, isLoading: modulesCatalogLoading } = useModules(undefined, {
    enabled: !!rootTenant?.iq_tenant_id,
    globalCatalog: true,
  });
  const { data: tenantModsRes, isLoading: tenantModsLoading } = useTenantModules(
    rootTenant?.iq_tenant_id ?? '',
    {
      enabled:
        !!rootTenant?.iq_tenant_id &&
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

  const branchColumns = useMemo<ColumnDef<ConfiguratorTenant, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        id: 'record_kind',
        header: 'Record',
        cell: ({ row }) =>
          row.original.parent_tenant_id == null ? (
            <Badge variant="default" className="text-xs font-normal">
              Default environment
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs font-normal">
              Branch
            </Badge>
          ),
      },
      {
        accessorKey: 'branch_code',
        header: 'Code',
        cell: ({ row, getValue }) => {
          const v = getValue<string | null>();
          if (v) return <code className="text-xs">{v}</code>;
          if (row.original.parent_tenant_id == null) {
            return <span className="text-muted-foreground text-xs">— (org root)</span>;
          }
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
          if (row.original.parent_tenant_id == null) {
            const t = row.original.type.replace(/_/g, ' ');
            return <Badge variant="outline" className="text-xs font-normal capitalize">{t}</Badge>;
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

  const tenantModuleActiveById = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of tenantModsRes?.data ?? []) {
      m.set(r.module_id, r.is_active);
    }
    return m;
  }, [tenantModsRes?.data]);

  const catalogModules = useMemo(
    () => (modulesRes?.data ?? []).filter((mod) => !mod.is_deleted),
    [modulesRes?.data],
  );

  const moduleColumns = useMemo<ColumnDef<Module, unknown>[]>(
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
        header: () => <div className="text-right">Enabled for tenant</div>,
        cell: ({ row }) => {
          const on = tenantModuleActiveById.get(row.original.id) === true;
          return (
            <div className="text-right">
              <Badge variant={on ? 'default' : 'secondary'}>{on ? 'Yes' : 'No'}</Badge>
            </div>
          );
        },
      },
    ],
    [tenantModuleActiveById],
  );

  const branches = branchesRes?.data ?? [];
  /** Root tenant is created with the org; show it first so Branches is never empty for a healthy tenant. */
  const branchTableRows = useMemo(
    () => (rootTenant ? [rootTenant, ...branches] : branches),
    [rootTenant, branches],
  );
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

  if (!rootTenant) {
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
            New tenants created from this app get a default environment automatically. Older or
            manually inserted organizations may need a root tenant row added in the database, or
            you can create another organization from the tenant list.
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
            <BreadcrumbPage className="max-w-[12rem] truncate">{org.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Back to list">
            <Link to="/configurator/tenant">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{org.name}</h1>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4 w-full">
        <TabsList
          variant="line"
          className="flex h-auto w-full flex-nowrap justify-between gap-0 bg-transparent p-0"
        >
          <TabsTrigger value="overview" className="flex-1 px-2 text-xs sm:text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex-1 px-2 text-xs sm:text-sm">
            Branches
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 px-2 text-xs sm:text-sm">
            Users
          </TabsTrigger>
          <TabsTrigger value="role-templates" className="flex-1 px-2 text-xs sm:text-sm">
            Role Templates
          </TabsTrigger>
          <TabsTrigger value="department-templates" className="flex-1 px-2 text-xs sm:text-sm">
            Department templates
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex-1 px-2 text-xs sm:text-sm">
            Billing
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex-1 px-2 text-xs sm:text-sm">
            Modules
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="flex-1 px-2 text-xs sm:text-sm">
            Audit logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 w-full">
          <div className="w-full rounded-lg border text-sm">
            <dl className="divide-y">
              <OverviewField label="Organization" value={org.name} />
              <OverviewField label="Slug" value={`${org.slug}.iqhealth.app`} />
              <OverviewField label="Plan" value={planSlug} />
              <OverviewField
                label="Status"
                value={provisioningLabel(rootTenant.provisioning_status)}
              />
              <div className="grid grid-cols-[minmax(10rem,14rem)_1fr] items-start gap-x-6 gap-y-2 px-4 py-3">
                <dt className="text-muted-foreground">Modules enabled</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {activeModuleNames.length === 0 ? (
                    <span className="text-muted-foreground">None</span>
                  ) : (
                    activeModuleNames.map((name) => (
                      <Badge key={name} variant="outline" className="text-xs font-normal">
                        {name}
                      </Badge>
                    ))
                  )}
                </dd>
              </div>
              <div className="grid gap-4 px-4 py-3 sm:grid-cols-3">
                <OverviewStat label="Total users" value="—" />
                <OverviewStat
                  label="Active branches"
                  value={branchesLoading ? '…' : String(branches.length)}
                />
                <OverviewStat label="Monthly test volume" value="—" />
              </div>
              <OverviewField label="Created" value={formatShortDate(org.created_at)} />
              <OverviewField label="Updated" value={formatShortDate(org.updated_at)} />
            </dl>
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
              data={branchTableRows}
              isLoading={branchesLoading}
              emptyTitle="No environments"
              emptyDescription="No tenant rows returned for this organization."
            />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <TenantUsersPanel iqTenantId={rootTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="role-templates" className="mt-4">
          <TenantRoleTemplatesPanel iqTenantId={rootTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="department-templates" className="mt-4">
          <TenantDepartmentsPanel iqTenantId={rootTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <TenantBillingPanel iqTenantId={rootTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <div className="rounded-lg border">
            <DataTable
              columns={moduleColumns}
              data={catalogModules}
              isLoading={modulesCatalogLoading || tenantModsLoading}
              emptyTitle="No modules in catalog"
              emptyDescription="Add modules under Master data → Modules."
            />
          </div>
        </TabsContent>

        <TabsContent value="audit-logs" className="mt-4">
          <TenantTabComingSoon
            title="Audit logs"
            body="Immutable audit trails for this tenant are not exposed via master-data. This will link to an audit service when available."
          />
        </TabsContent>
      </Tabs>

      <AddBranchDialog
        open={addBranchOpen}
        onOpenChange={setAddBranchOpen}
        organizationId={organizationId}
        organizationSlug={org.slug}
        parentTenantId={rootTenant.iq_tenant_id}
      />
    </div>
  );
}
