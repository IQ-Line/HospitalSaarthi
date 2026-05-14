import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
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
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { Switch } from '@pulse/ui/switch';
import { Textarea } from '@pulse/ui/textarea';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import {
  useCreateSystemRole,
  useDeleteSystemRole,
  useSystemRoles,
  useUpdateSystemRole,
} from '@/features/master-data/api';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { EntityRowActions } from '@/features/master-data/components/entity-row-actions';
import { MasterDataPageShell } from '@/features/master-data/components/master-data-page-shell';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import { toSlug } from '@/features/master-data/utils';
import {
  EMPTY_SYSTEM_ROLE_FORM_VALUES,
  systemRoleFormSchema,
  type SystemRoleFormValues,
} from '@/features/master-data/validation';
import type { SystemRole } from '@/features/master-data/types';

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

  const createForm = useForm<SystemRoleFormValues>({
    resolver: zodResolver(systemRoleFormSchema),
    defaultValues: EMPTY_SYSTEM_ROLE_FORM_VALUES,
  });

  const editForm = useForm<SystemRoleFormValues>({
    resolver: zodResolver(systemRoleFormSchema),
    defaultValues: EMPTY_SYSTEM_ROLE_FORM_VALUES,
  });

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
            onEdit={() => {
              setEditingRole(row.original);
              editForm.reset({
                name: row.original.name,
                slug: row.original.slug,
                description: row.original.description,
                is_template: row.original.is_template,
                is_active: row.original.is_active,
              });
            }}
            onDelete={() => setDeletingRole(row.original)}
            disabled={deleteMutation.isPending}
          />
        ),
      },
    ],
    [deleteMutation.isPending, editForm, updateMutation.isPending, updateMutation.variables],
  );

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success('System role created');
      setIsCreateOpen(false);
      createForm.reset(EMPTY_SYSTEM_ROLE_FORM_VALUES);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editingRole) return;
    try {
      await updateMutation.mutateAsync({
        id: editingRole.id,
        input: values,
      });
      toast.success('System role updated');
      setEditingRole(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

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

      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            createForm.reset(EMPTY_SYSTEM_ROLE_FORM_VALUES);
          }
        }}
        title="Create System Role"
        description="Create a reusable role template."
        submitLabel="Create Role"
        isSubmitting={createMutation.isPending}
        onSubmit={onCreateSubmit}
      >
        <SystemRoleFormFields form={createForm} />
      </EntityFormDialog>

      <EntityFormDialog
        open={!!editingRole}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRole(null);
          }
        }}
        title="Update System Role"
        description="Update role template metadata."
        submitLabel="Save Changes"
        isSubmitting={updateMutation.isPending}
        onSubmit={onEditSubmit}
      >
        <SystemRoleFormFields form={editForm} />
      </EntityFormDialog>

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

interface SystemRoleFormFieldsProps {
  form: ReturnType<typeof useForm<SystemRoleFormValues>>;
}

function SystemRoleFormFields({ form }: SystemRoleFormFieldsProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const watchedName = watch('name');
  const slugSuggestion = toSlug(watchedName);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="role-name">Name</Label>
          <Input id="role-name" placeholder="e.g. Ward Clerk" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-slug">Slug</Label>
          <Input
            id="role-slug"
            placeholder={slugSuggestion || 'ward-clerk'}
            {...register('slug')}
          />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-description">Description (optional)</Label>
        <Textarea
          id="role-description"
          rows={3}
          placeholder={`Describe responsibilities for ${watchedName || 'this role'}`}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Template Role</p>
            <p className="text-xs text-muted-foreground">Marks this as a platform template.</p>
          </div>
          <Controller
            name="is_template"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Inactive roles are hidden from active lists.</p>
          </div>
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </div>
  );
}
