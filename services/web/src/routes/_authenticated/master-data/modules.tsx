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
  useCreateModule,
  useDeleteModule,
  useModules,
  useUpdateModule,
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
  EMPTY_MODULE_FORM_VALUES,
  moduleFormSchema,
  type ModuleFormValues,
  type ModuleFormInput,
} from '@/features/master-data/validation';
import type { Module, ModuleCategory } from '@/features/master-data/types';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';

export const Route = createFileRoute('/_authenticated/master-data/modules')({
  component: ModulesPage,
});

const moduleCategoryOptions: Array<{ value: ModuleCategory; label: string }> = [
  { value: 'core', label: 'Core' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'support', label: 'Support' },
];

function ModulesPage() {
  const { canCreate, canUpdate, canDelete } = useCatalogModuleCrud('modules', {
    productModuleSlug: 'master-data',
  });
  const [tableSearch, setTableSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ModuleCategory | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [viewingModule, setViewingModule] = useState<Module | null>(null);
  const [deletingModule, setDeletingModule] = useState<Module | null>(null);

  const category = categoryFilter === 'all' ? undefined : categoryFilter;
  const { data, isLoading, error } = useModules(category, { globalCatalog: true });
  const modules = data?.data ?? [];

  const createMutation = useCreateModule();
  const updateMutation = useUpdateModule();
  const deleteMutation = useDeleteModule();

  const createForm = useForm<ModuleFormInput, unknown, ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: EMPTY_MODULE_FORM_VALUES,
  });

  const editForm = useForm<ModuleFormInput, unknown, ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: EMPTY_MODULE_FORM_VALUES,
  });

  const parentOptions = useMemo(() => {
    if (!editingModule) {
      return modules;
    }
    return modules.filter((module) => module.id !== editingModule.id);
  }, [editingModule, modules]);

  const filteredModules = useMemo(() => {
    return modules.filter((m) =>
      rowMatchesSearch(
        tableSearch,
        m.name,
        m.slug,
        m.category,
        m.version,
        String(m.level),
      ),
    );
  }, [modules, tableSearch]);

  const columns = useMemo<ColumnDef<Module, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'level',
        header: 'Level',
      },
      {
        accessorKey: 'version',
        header: 'Version',
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
                      next ? 'Module activated' : 'Module deactivated',
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
            onView={() => setViewingModule(row.original)}
            onEdit={() => {
              setEditingModule(row.original);
              editForm.reset({
                name: row.original.name,
                slug: row.original.slug,
                category: row.original.category,
                version: row.original.version,
                description: row.original.description,
                parent_id: row.original.parent_id,
                icon: row.original.icon,
                is_active: row.original.is_active,
              });
            }}
            onDelete={() => setDeletingModule(row.original)}
            disabled={deleteMutation.isPending}
            canEdit={canUpdate}
            canDelete={canDelete}
          />
        ),
      },
    ],
    [
      canDelete,
      canUpdate,
      deleteMutation.isPending,
      editForm,
      updateMutation.isPending,
      updateMutation.variables,
    ],
  );

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Module created');
      setIsCreateOpen(false);
      createForm.reset(EMPTY_MODULE_FORM_VALUES);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editingModule) return;
    try {
      await updateMutation.mutateAsync({
        id: editingModule.id,
        input: values,
      });
      toast.success('Module updated');
      setEditingModule(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  const onDeleteConfirm = async () => {
    if (!deletingModule) return;
    try {
      await deleteMutation.mutateAsync(deletingModule.id);
      toast.success('Module deleted');
      setDeletingModule(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  };

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load modules: {error.message}
      </div>
    );
  }

  return (
    <MasterDataPageShell
      section="modules"
      title="Modules"
      description="Manage module catalog hierarchy and metadata."
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as ModuleCategory | 'all')}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {moduleCategoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate ? (
            <Button onClick={() => setIsCreateOpen(true)}>Create Module</Button>
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
            placeholder="Search name, slug, category, version…"
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredModules}
          isLoading={isLoading}
          emptyTitle="No modules found"
          emptyDescription="Create a module to start building your catalog."
        />
      </div>

      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            createForm.reset(EMPTY_MODULE_FORM_VALUES);
          }
        }}
        title="Create Module"
        description="Add a new module to the platform catalog."
        submitLabel="Create Module"
        isSubmitting={createMutation.isPending}
        onSubmit={onCreateSubmit}
      >
        <ModuleFormFields form={createForm} modules={modules} />
      </EntityFormDialog>

      <EntityFormDialog
        open={!!editingModule}
        onOpenChange={(open) => {
          if (!open) {
            setEditingModule(null);
          }
        }}
        title="Update Module"
        description="Update metadata for this module."
        submitLabel="Save Changes"
        isSubmitting={updateMutation.isPending}
        onSubmit={onEditSubmit}
      >
        <ModuleFormFields form={editForm} modules={parentOptions} />
      </EntityFormDialog>

      <Dialog open={!!viewingModule} onOpenChange={(open) => !open && setViewingModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Module details</DialogTitle>
            <DialogDescription>Read-only module information.</DialogDescription>
          </DialogHeader>
          {viewingModule && (
            <div className="space-y-2 text-sm">
              <ReadOnlyRow label="Name" value={viewingModule.name} />
              <ReadOnlyRow label="Slug" value={viewingModule.slug} />
              <ReadOnlyRow label="Category" value={viewingModule.category} />
              <ReadOnlyRow label="Version" value={viewingModule.version} />
              <ReadOnlyRow
                label="Status"
                value={viewingModule.is_active ? 'Active' : 'Inactive'}
              />
              <ReadOnlyRow label="Level" value={String(viewingModule.level)} />
              <ReadOnlyRow label="Description" value={viewingModule.description ?? '-'} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingModule}
        onOpenChange={(open) => !open && setDeletingModule(null)}
        title="Delete module"
        description={`Soft-delete module "${deletingModule?.name ?? ''}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={onDeleteConfirm}
      />
    </MasterDataPageShell>
  );
}

interface ModuleFormFieldsProps {
  form: ReturnType<typeof useForm<ModuleFormInput, unknown, ModuleFormValues>>;
  modules: Module[];
}

function ModuleFormFields({ form, modules }: ModuleFormFieldsProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const watchedName = watch('name');
  const watchedCategory = watch('category');
  const slugSuggestion = toSlug(watchedName);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="module-name">Name</Label>
          <Input
            id="module-name"
            placeholder={`e.g. ${watchedCategory?.toUpperCase() ?? 'CORE'} Module`}
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="module-slug">Slug</Label>
          <Input
            id="module-slug"
            placeholder={slugSuggestion || `${watchedCategory ?? 'core'}-module`}
            {...register('slug')}
          />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select category for ${watchedName || 'module'}`} />
                </SelectTrigger>
                <SelectContent>
                  {moduleCategoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="module-version">Version</Label>
          <Input
            id="module-version"
            placeholder={watchedName ? `${toSlug(watchedName)}-v1` : '1.0.0'}
            {...register('version')}
          />
          {errors.version && <p className="text-xs text-destructive">{errors.version.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Parent module (optional)</Label>
          <Controller
            name="parent_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? '__none__'}
                onValueChange={(value) => field.onChange(value === '__none__' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select parent for ${watchedName || 'module'}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No parent</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.parent_id && (
            <p className="text-xs text-destructive">{errors.parent_id.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="module-icon">Icon (optional)</Label>
          <Input
            id="module-icon"
            placeholder={slugSuggestion ? `${slugSuggestion}-icon` : 'building-2'}
            {...register('icon')}
          />
          {errors.icon && <p className="text-xs text-destructive">{errors.icon.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="module-description">Description (optional)</Label>
        <Textarea
          id="module-description"
          rows={3}
          placeholder={`Describe ${watchedName || 'this module'} usage and scope`}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Active</p>
          <p className="text-xs text-muted-foreground">Inactive modules remain in catalog.</p>
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

