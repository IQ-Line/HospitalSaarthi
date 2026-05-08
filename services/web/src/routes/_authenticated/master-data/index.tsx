import { createFileRoute } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { useModules } from '@/features/master-data/api';
import type { Module } from '@/features/master-data/types';

const columns: ColumnDef<Module, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'slug', header: 'Slug', cell: ({ getValue }) => (
    <code className="text-xs">{getValue<string>()}</code>
  )},
  { accessorKey: 'category', header: 'Category', cell: ({ getValue }) => (
    <Badge variant="secondary">{getValue<string>()}</Badge>
  )},
  { accessorKey: 'version', header: 'Version', cell: ({ getValue }) => (
    <code className="text-xs">{getValue<string>()}</code>
  )},
  { accessorKey: 'is_active', header: 'Status', cell: ({ getValue }) => (
    <Badge variant={getValue<boolean>() ? 'default' : 'outline'}>
      {getValue<boolean>() ? 'Active' : 'Inactive'}
    </Badge>
  )},
];

export const Route = createFileRoute('/_authenticated/master-data/')({
  component: MasterDataIndexPage,
});

function MasterDataIndexPage() {
  const { data, isLoading, error } = useModules();

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load modules: {error.message}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Master Data"
        description="Platform catalog — modules, permissions, and system role templates."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success('Toast is working!')}
          >
            Test Toast
          </Button>
        }
      />

      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          emptyTitle="No modules"
          emptyDescription="No modules registered yet. Use the Master Data API to seed data."
        />
      </div>
    </div>
  );
}
