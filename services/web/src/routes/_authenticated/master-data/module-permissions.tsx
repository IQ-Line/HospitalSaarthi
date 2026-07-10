import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
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
import { DataTable } from '@/components/data-table';
import {
  useCreateModulePermission,
  useModulePermissions,
  useModules,
  usePermissions,
  useUpdateModulePermission,
} from '@/features/master-data/api';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { EntityRowActions } from '@/features/master-data/components/entity-row-actions';
import { MasterDataPageShell } from '@/features/master-data/components/master-data-page-shell';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import {
  EMPTY_MODULE_PERMISSION_FORM_VALUES,
  EMPTY_MODULE_PERMISSION_UPDATE_VALUES,
  modulePermissionFormSchema,
  modulePermissionUpdateSchema,
  type ModulePermissionFormValues,
  type ModulePermissionFormInput,
  type ModulePermissionUpdateValues,
  type ModulePermissionUpdateInput,
} from '@/features/master-data/validation';
import type { ModulePermission } from '@/features/master-data/types';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';

export const Route = createFileRoute('/_authenticated/master-data/module-permissions')({
  component: ModulePermissionsPage,
});

function ModulePermissionsPage() {
  const { canCreate, canUpdate } = useCatalogModuleCrud('permissions', {
    productModuleSlug: 'master-data',
  });
  const [tableSearch, setTableSearch] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ModulePermission | null>(null);
  const [viewingLink, setViewingLink] = useState<ModulePermission | null>(null);

  const { data: modulesData } = useModules();
  const { data: permissionsData } = usePermissions();

  const modules = modulesData?.data ?? [];
  const permissions = permissionsData?.data ?? [];

  const { data, isLoading, error } = useModulePermissions({
    module_id: selectedModuleId ?? undefined,
    limit: 200,
    offset: 0,
  });
  const links = data?.data ?? [];

  const permissionNameById = useMemo(() => {
    return new Map(permissions.map((permission) => [permission.id, permission.name]));
  }, [permissions]);

  const moduleNameById = useMemo(() => {
    return new Map(modules.map((module) => [module.id, module.name]));
  }, [modules]);

  const createMutation = useCreateModulePermission();
  const updateMutation = useUpdateModulePermission();

  const createForm = useForm<ModulePermissionFormInput, unknown, ModulePermissionFormValues>({
    resolver: zodResolver(modulePermissionFormSchema),
    defaultValues: {
      ...EMPTY_MODULE_PERMISSION_FORM_VALUES,
      module_id: selectedModuleId ?? '',
    },
  });

  const editForm = useForm<ModulePermissionUpdateInput, unknown, ModulePermissionUpdateValues>({
    resolver: zodResolver(modulePermissionUpdateSchema),
    defaultValues: EMPTY_MODULE_PERMISSION_UPDATE_VALUES,
  });

  useEffect(() => {
    createForm.setValue('module_id', selectedModuleId ?? '');
  }, [createForm, selectedModuleId]);

  const filteredLinks = useMemo(() => {
    return links.filter((link) =>
      rowMatchesSearch(
        tableSearch,
        link.slug,
        moduleNameById.get(link.module_id),
        permissionNameById.get(link.permission_id),
      ),
    );
  }, [links, moduleNameById, permissionNameById, tableSearch]);

  const columns = useMemo<ColumnDef<ModulePermission, unknown>[]>(
    () => [
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'module_id',
        header: 'Module',
        cell: ({ getValue }) => moduleNameById.get(getValue<string>()) ?? '-',
      },
      {
        accessorKey: 'permission_id',
        header: 'Permission',
        cell: ({ getValue }) => permissionNameById.get(getValue<string>()) ?? '-',
      },
      {
        accessorKey: 'is_default',
        header: 'Default',
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
              !canUpdate ||
              (updateMutation.isPending &&
                updateMutation.variables?.id === row.original.id)
            }
            onCheckedChange={(next) => {
              if (next === row.original.is_active) return;
              updateMutation.mutate(
                { id: row.original.id, input: { is_active: next } },
                {
                  onSuccess: () =>
                    toast.success(
                      next ? 'Assignment activated' : 'Assignment deactivated',
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
            onView={() => setViewingLink(row.original)}
            onEdit={() => {
              setEditingLink(row.original);
              editForm.reset({
                slug: row.original.slug,
                is_default: row.original.is_default,
                is_active: row.original.is_active,
              });
            }}
            canEdit={canUpdate}
          />
        ),
      },
    ],
    [
      canUpdate,
      editForm,
      moduleNameById,
      permissionNameById,
      updateMutation.isPending,
      updateMutation.variables,
    ],
  );

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Module permission linked');
      setIsCreateOpen(false);
      createForm.reset({
        ...EMPTY_MODULE_PERMISSION_FORM_VALUES,
        module_id: selectedModuleId ?? '',
      });
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editingLink) return;
    try {
      await updateMutation.mutateAsync({
        id: editingLink.id,
        input: values,
      });
      toast.success('Module permission updated');
      setEditingLink(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load module permissions: {error.message}
      </div>
    );
  }

  return (
    <MasterDataPageShell
      section="module-permissions"
      title="Module Permissions"
      description="Assign permissions to modules and maintain mapping metadata."
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={selectedModuleId ?? '__none__'}
            onValueChange={(value) => {
              if (value === '__none__') {
                setSelectedModuleId(null);
                return;
              }
              setSelectedModuleId(value);
            }}
          >
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Select module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All modules</SelectItem>
              {modules.map((module) => (
                <SelectItem key={module.id} value={module.id}>
                  {module.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate ? (
            <Button onClick={() => setIsCreateOpen(true)}>Add Assignment</Button>
          ) : null}
        </div>
      }
    >
      <div className="rounded-lg border">
        <div className="p-3 border-b">
          <MasterDataTableToolbar
            value={tableSearch}
            onChange={setTableSearch}
            debounceMs={0}
            placeholder="Search slug, module, permission…"
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredLinks}
          isLoading={isLoading}
          emptyTitle="No module permissions found"
          emptyDescription="Add an assignment to map module access."
        />
      </div>

      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            createForm.reset({
              ...EMPTY_MODULE_PERMISSION_FORM_VALUES,
              module_id: selectedModuleId ?? '',
            });
          }
        }}
        title="Add Module Permission"
        description="Create a new module-to-permission assignment."
        submitLabel="Create Assignment"
        isSubmitting={createMutation.isPending}
        onSubmit={onCreateSubmit}
      >
        <ModulePermissionCreateFields
          form={createForm}
          modules={modules}
          permissions={permissions}
        />
      </EntityFormDialog>

      <EntityFormDialog
        open={!!editingLink}
        onOpenChange={(open) => {
          if (!open) {
            setEditingLink(null);
          }
        }}
        title="Update Module Permission"
        description="Update assignment metadata."
        submitLabel="Save Changes"
        isSubmitting={updateMutation.isPending}
        onSubmit={onEditSubmit}
      >
        <ModulePermissionUpdateFields form={editForm} />
      </EntityFormDialog>

      <Dialog open={!!viewingLink} onOpenChange={(open) => !open && setViewingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment details</DialogTitle>
            <DialogDescription>Read-only module permission details.</DialogDescription>
          </DialogHeader>
          {viewingLink && (
            <div className="space-y-2 text-sm">
              <ReadOnlyRow label="Slug" value={viewingLink.slug} />
              <ReadOnlyRow
                label="Module"
                value={moduleNameById.get(viewingLink.module_id) ?? viewingLink.module_id}
              />
              <ReadOnlyRow
                label="Permission"
                value={permissionNameById.get(viewingLink.permission_id) ?? viewingLink.permission_id}
              />
              <ReadOnlyRow label="Default" value={viewingLink.is_default ? 'Yes' : 'No'} />
              <ReadOnlyRow label="Status" value={viewingLink.is_active ? 'Active' : 'Inactive'} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MasterDataPageShell>
  );
}

interface ModulePermissionCreateFieldsProps {
  form: ReturnType<typeof useForm<ModulePermissionFormInput, unknown, ModulePermissionFormValues>>;
  modules: Array<{ id: string; name: string; slug: string }>;
  permissions: Array<{ id: string; name: string; slug: string; action: string }>;
}

function ModulePermissionCreateFields({
  form,
  modules,
  permissions,
}: ModulePermissionCreateFieldsProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const selectedModuleId = watch('module_id');
  const selectedPermissionId = watch('permission_id');
  const selectedModule = modules.find((module) => module.id === selectedModuleId);
  const selectedPermission = permissions.find(
    (permission) => permission.id === selectedPermissionId,
  );
  const slugPlaceholder =
    selectedModule && selectedPermission
      ? `${selectedModule.slug}--${selectedPermission.slug}`
      : selectedModule
        ? `${selectedModule.slug}--permission`
        : 'module--permission';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="module-permission-slug">Slug</Label>
        <Input
          id="module-permission-slug"
          placeholder={slugPlaceholder}
          {...register('slug')}
        />
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Module</Label>
          <Controller
            name="module_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select module to assign permission" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.module_id && (
            <p className="text-xs text-destructive">{errors.module_id.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Permission</Label>
          <Controller
            name="permission_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedModule
                        ? `Select permission for ${selectedModule.name}`
                        : 'Select permission'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {permissions.map((permission) => (
                    <SelectItem key={permission.id} value={permission.id}>
                      {permission.name} ({permission.action})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.permission_id && (
            <p className="text-xs text-destructive">{errors.permission_id.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Default Assignment</p>
            <p className="text-xs text-muted-foreground">Apply by default during tenant bootstrap.</p>
          </div>
          <Controller
            name="is_default"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Inactive assignments remain for history.</p>
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

interface ModulePermissionUpdateFieldsProps {
  form: ReturnType<typeof useForm<ModulePermissionUpdateInput, unknown, ModulePermissionUpdateValues>>;
}

function ModulePermissionUpdateFields({ form }: ModulePermissionUpdateFieldsProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const currentSlug = watch('slug');

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="module-permission-update-slug">Slug</Label>
        <Input
          id="module-permission-update-slug"
          placeholder={currentSlug || 'module--permission'}
          {...register('slug')}
        />
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Default Assignment</p>
            <p className="text-xs text-muted-foreground">Apply by default during tenant bootstrap.</p>
          </div>
          <Controller
            name="is_default"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Inactive assignments remain for history.</p>
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

