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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Switch } from '@pulse/ui/switch';
import { Textarea } from '@pulse/ui/textarea';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import {
  useCreatePermission,
  useDeletePermission,
  usePermissions,
  useUpdatePermission,
} from '@/features/master-data/api';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { EntityRowActions } from '@/features/master-data/components/entity-row-actions';
import { MasterDataPageShell } from '@/features/master-data/components/master-data-page-shell';
import {
  permissionActionSchema,
  permissionFormSchema,
  type PermissionFormValues,
} from '@/features/master-data/validation';
import type { Permission, PermissionAction } from '@/features/master-data/types';

export const Route = createFileRoute('/_authenticated/master-data/permissions')({
  component: PermissionsPage,
});

function PermissionsPage() {
  const [actionFilter, setActionFilter] = useState<PermissionAction | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [viewingPermission, setViewingPermission] = useState<Permission | null>(null);
  const [deletingPermission, setDeletingPermission] = useState<Permission | null>(null);

  const action = actionFilter === 'all' ? undefined : actionFilter;
  const { data, isLoading, error } = usePermissions(action);
  const permissions = data?.data ?? [];

  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission(editingPermission?.id ?? '');
  const deleteMutation = useDeletePermission();

  const createForm = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      action: 'read',
      description: null,
      is_active: true,
    },
  });

  const editForm = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      action: 'read',
      description: null,
      is_active: true,
    },
  });

  const actionOptions = useMemo(() => permissionActionSchema.options, []);

  const columns = useMemo<ColumnDef<Permission, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant={getValue<boolean>() ? 'default' : 'outline'}>
            {getValue<boolean>() ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <EntityRowActions
            onView={() => setViewingPermission(row.original)}
            onEdit={() => {
              setEditingPermission(row.original);
              editForm.reset({
                name: row.original.name,
                slug: row.original.slug,
                action: row.original.action,
                description: row.original.description,
                is_active: row.original.is_active,
              });
            }}
            onDelete={() => setDeletingPermission(row.original)}
            disabled={deleteMutation.isPending}
          />
        ),
      },
    ],
    [deleteMutation.isPending, editForm],
  );

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    await createMutation.mutateAsync(values);
    toast.success('Permission created');
    setIsCreateOpen(false);
    createForm.reset();
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editingPermission) return;
    await updateMutation.mutateAsync(values);
    toast.success('Permission updated');
    setEditingPermission(null);
  });

  const onDeleteConfirm = async () => {
    if (!deletingPermission) return;
    await deleteMutation.mutateAsync(deletingPermission.id);
    toast.success('Permission deleted');
    setDeletingPermission(null);
  };

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load permissions: {error.message}
      </div>
    );
  }

  return (
    <MasterDataPageShell
      section="permissions"
      title="Permissions"
      description="Manage permission slugs used across platform modules."
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={actionFilter}
            onValueChange={(value) => setActionFilter(value as PermissionAction | 'all')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateOpen(true)}>Create Permission</Button>
        </div>
      }
    >
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={permissions}
          isLoading={isLoading}
          emptyTitle="No permissions found"
          emptyDescription="Create a permission to begin role mapping."
        />
      </div>

      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            createForm.reset();
          }
        }}
        title="Create Permission"
        description="Create a module action permission."
        submitLabel="Create Permission"
        isSubmitting={createMutation.isPending}
        onSubmit={onCreateSubmit}
      >
        <PermissionFormFields form={createForm} actionOptions={actionOptions} />
      </EntityFormDialog>

      <EntityFormDialog
        open={!!editingPermission}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPermission(null);
          }
        }}
        title="Update Permission"
        description="Edit permission metadata."
        submitLabel="Save Changes"
        isSubmitting={updateMutation.isPending}
        onSubmit={onEditSubmit}
      >
        <PermissionFormFields form={editForm} actionOptions={actionOptions} />
      </EntityFormDialog>

      <Dialog open={!!viewingPermission} onOpenChange={(open) => !open && setViewingPermission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permission details</DialogTitle>
            <DialogDescription>Read-only permission information.</DialogDescription>
          </DialogHeader>
          {viewingPermission && (
            <div className="space-y-2 text-sm">
              <ReadOnlyRow label="Name" value={viewingPermission.name} />
              <ReadOnlyRow label="Slug" value={viewingPermission.slug} />
              <ReadOnlyRow label="Action" value={viewingPermission.action} />
              <ReadOnlyRow
                label="Status"
                value={viewingPermission.is_active ? 'Active' : 'Inactive'}
              />
              <ReadOnlyRow label="Description" value={viewingPermission.description ?? '-'} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingPermission}
        onOpenChange={(open) => !open && setDeletingPermission(null)}
        title="Delete permission"
        description={`Soft-delete permission "${deletingPermission?.name ?? ''}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={onDeleteConfirm}
      />
    </MasterDataPageShell>
  );
}

interface PermissionFormFieldsProps {
  form: ReturnType<typeof useForm<PermissionFormValues>>;
  actionOptions: readonly string[];
}

function PermissionFormFields({ form, actionOptions }: PermissionFormFieldsProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const watchedName = watch('name');
  const watchedAction = watch('action');
  const slugSuggestion = toSlug(watchedName);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="permission-name">Name</Label>
          <Input
            id="permission-name"
            placeholder={`e.g. ${capitalize(watchedAction || 'read')} Module`}
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="permission-slug">Slug</Label>
          <Input
            id="permission-slug"
            placeholder={
              slugSuggestion
                ? `${slugSuggestion}:${watchedAction || 'read'}`
                : `module:${watchedAction || 'read'}`
            }
            {...register('slug')}
          />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Action</Label>
        <Controller
          name="action"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={`Select action for ${watchedName || 'permission'}`} />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.action && <p className="text-xs text-destructive">{errors.action.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="permission-description">Description (optional)</Label>
        <Textarea
          id="permission-description"
          rows={3}
          placeholder={`Describe when "${watchedName || 'this permission'}" should be granted`}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Active</p>
          <p className="text-xs text-muted-foreground">Inactive permission is hidden from active lists.</p>
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
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toSlug(value?: string | null) {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
