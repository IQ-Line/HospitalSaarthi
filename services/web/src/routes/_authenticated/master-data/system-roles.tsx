import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import {
  useCreateSystemRole,
  useDeleteSystemRole,
  useSystemRoles,
  useUpdateSystemRole,
} from '@/features/master-data/api';
import {
  SystemRoleFormDialog,
  systemRoleToFormValues,
} from '@/features/master-data/components/system-role-form-dialog';
import { EntityRowActions } from '@/features/master-data/components/entity-row-actions';
import { MasterDataPageShell } from '@/features/master-data/components/master-data-page-shell';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import { EMPTY_SYSTEM_ROLE_FORM_VALUES } from '@/features/master-data/validation';
import type {
  SystemRole,
  SystemRoleCreateInput,
  SystemRoleUpdateInput,
} from '@/features/master-data/types';

export const Route = createFileRoute('/_authenticated/master-data/system-roles')({
  component: SystemRolesPage,
});

function SystemRolesPage() {
  const [tableSearch, setTableSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState<'all' | 'template' | 'non-template'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);
  const [viewingRole, setViewingRole] = useState<SystemRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<SystemRole | null>(null);

  const templateParam =
    templateFilter === 'all' ? undefined : templateFilter === 'template';

  const { data, isLoading, error } = useSystemRoles(templateParam);
  const roles = data?.data ?? [];

  const createMutation = useCreateSystemRole();
  const updateMutation = useUpdateSystemRole();
  const deleteMutation = useDeleteSystemRole();

  const editDefaults = useMemo(
    () => (editingRole ? systemRoleToFormValues(editingRole) : EMPTY_SYSTEM_ROLE_FORM_VALUES),
    [editingRole],
  );

  const filteredRoles = useMemo(() => {
    return roles.filter((r) =>
      rowMatchesSearch(tableSearch, r.name, r.slug, String(r.is_template)),
    );
  }, [roles, tableSearch]);

  const columns = useMemo<ColumnDef<SystemRole, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'is_template',
        header: 'Template',
        cell: ({ getValue }) => (
          <Badge variant={getValue<boolean>() ? 'secondary' : 'outline'}>
            {getValue<boolean>() ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={
              updateMutation.isPending &&
              updateMutation.variables?.id === row.original.id
            }
            onCheckedChange={(next) => {
              if (next === row.original.is_active) return;
              updateMutation.mutate(
                { id: row.original.id, input: { is_active: next } },
                {
                  onSuccess: () =>
                    toast.success(
                      next ? 'System role activated' : 'System role deactivated',
                    ),
                  onError: (err) =>
                    toast.error(mutationErrorMessage(err)),
                },
              );
            }}
          />
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <EntityRowActions
            onView={() => setViewingRole(row.original)}
            onEdit={() => setEditingRole(row.original)}
            onDelete={() => setDeletingRole(row.original)}
            disabled={deleteMutation.isPending}
          />
        ),
      },
    ],
    [deleteMutation.isPending, updateMutation.isPending, updateMutation.variables],
  );

  const onDeleteConfirm = async () => {
    if (!deletingRole) return;
    try {
      await deleteMutation.mutateAsync(deletingRole.id);
      toast.success('System role deleted');
      setDeletingRole(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  };

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load system roles: {error.message}
      </div>
    );
  }

  return (
    <MasterDataPageShell
      section="system-roles"
      title="System Roles"
      description="Manage reusable platform role templates."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant={templateFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTemplateFilter('all')}
          >
            All
          </Button>
          <Button
            variant={templateFilter === 'template' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTemplateFilter('template')}
          >
            Templates
          </Button>
          <Button
            variant={templateFilter === 'non-template' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTemplateFilter('non-template')}
          >
            Non-template
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>Create System Role</Button>
        </div>
      }
    >
      <div className="rounded-lg border">
        <div className="p-3 border-b">
          <MasterDataTableToolbar
            value={tableSearch}
            onChange={setTableSearch}
            debounceMs={0}
            placeholder="Search name, slug…"
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredRoles}
          isLoading={isLoading}
          emptyTitle="No system roles found"
          emptyDescription="Create role templates for role provisioning."
        />
      </div>

      <SystemRoleFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        title="Create System Role"
        description="Define role settings and catalog permissions."
        submitLabel="Create Role"
        isSubmitting={createMutation.isPending}
        defaultValues={EMPTY_SYSTEM_ROLE_FORM_VALUES}
        onSubmit={async (payload) => {
          try {
            await createMutation.mutateAsync(payload as SystemRoleCreateInput);
            toast.success('System role created');
            setIsCreateOpen(false);
          } catch (err) {
            toast.error(mutationErrorMessage(err));
          }
        }}
      />

      <SystemRoleFormDialog
        open={!!editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
        mode="edit"
        title="Update System Role"
        description="Update role template settings and permissions."
        submitLabel="Save Changes"
        isSubmitting={updateMutation.isPending}
        defaultValues={editDefaults}
        onSubmit={async (payload) => {
          if (!editingRole) return;
          try {
            await updateMutation.mutateAsync({
              id: editingRole.id,
              input: payload as SystemRoleUpdateInput,
            });
            toast.success('System role updated');
            setEditingRole(null);
          } catch (err) {
            toast.error(mutationErrorMessage(err));
          }
        }}
      />

      <Dialog open={!!viewingRole} onOpenChange={(open) => !open && setViewingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>System role details</DialogTitle>
            <DialogDescription>Read-only role template details.</DialogDescription>
          </DialogHeader>
          {viewingRole && (
            <div className="space-y-2 text-sm">
              <ReadOnlyRow label="Name" value={viewingRole.name} />
              <ReadOnlyRow label="Slug" value={viewingRole.slug} />
              <ReadOnlyRow
                label="Template"
                value={viewingRole.is_template ? 'Yes' : 'No'}
              />
              <ReadOnlyRow label="Status" value={viewingRole.is_active ? 'Active' : 'Inactive'} />
              <ReadOnlyRow label="Description" value={viewingRole.description ?? '-'} />
              <ReadOnlyRow label="Role type" value={viewingRole.role_type ?? '—'} />
              <ReadOnlyRow
                label="Permissions"
                value={String(viewingRole.module_permission_ids?.length ?? 0)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        title="Delete system role"
        description={`Soft-delete role "${deletingRole?.name ?? ''}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={onDeleteConfirm}
      />
    </MasterDataPageShell>
  );
}
