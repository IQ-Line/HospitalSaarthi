import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
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
import { DataTable } from '@/components/data-table';
import {
  useCreateDepartment,
  useDepartmentPlatformImport,
  useDepartments,
  useDepartmentsGlobalLibrary,
  useDepartmentTenantImportKeys,
  useUpdateDepartment,
  DEPARTMENT_CATALOG_DEFAULT_PAGE_SIZE,
  DEPARTMENT_CATALOG_PAGE_SIZES,
} from '@/features/master-data/api';
import { useMasterDataTenantCatalog } from '@/features/master-data/hooks/use-master-data-tenant-catalog';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { EntityRowActions } from '@/features/master-data/components/entity-row-actions';
import { MasterDataPageShell } from '@/features/master-data/components/master-data-page-shell';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { toSlug } from '@/features/master-data/utils';
import {
  EMPTY_DEPARTMENT_FORM_VALUES,
  departmentFormSchema,
  departmentTypeSchema,
  type DepartmentFormValues,
} from '@/features/master-data/validation';
import type { Department, DepartmentType } from '@/features/master-data/types';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';

export const Route = createFileRoute('/_authenticated/master-data/departments')({
  component: DepartmentsPage,
});

const DEPARTMENT_TYPE_LABELS: Record<DepartmentType, string> = {
  clinical: 'Clinical',
  diagnostic: 'Diagnostic',
  administrative: 'Administrative',
  support: 'Support',
};

function DepartmentsPage() {
  const { canCreate, canUpdate } = useCatalogModuleCrud('departments', {
    productModuleSlug: 'master-data',
  });
  const { tenantCatalog } = useMasterDataTenantCatalog();
  const [tableSearch, setTableSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DepartmentType | 'all'>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [libPageIndex, setLibPageIndex] = useState(0);
  const libPageSize = 50;
  const { librarySearch, librarySearchDraft, setLibrarySearchDraft } = useVisitpadImportLibrarySearch(
    importOpen,
    setLibPageIndex,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEPARTMENT_CATALOG_DEFAULT_PAGE_SIZE);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(null);

  const deptType = typeFilter === 'all' ? undefined : typeFilter;
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [tableSearch, typeFilter]);
  const { data, isLoading, error } = useDepartments(deptType, {
    search: tableSearch || undefined,
    page: listPage,
  });
  const { data: globalLib, isLoading: globalLibLoading } = useDepartmentsGlobalLibrary(
    importOpen,
    deptType,
    { pageIndex: libPageIndex, pageSize: libPageSize },
    librarySearch || undefined,
  );
  const { data: tenantCodeKeys } = useDepartmentTenantImportKeys(importOpen && tenantCatalog);
  const departments = data?.data ?? [];
  const total = data?.total ?? 0;

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const platformImport = useDepartmentPlatformImport();

  const importedKeys = useMemo(() => tenantCodeKeys ?? new Set<string>(), [tenantCodeKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;

  const importSearchParts = useCallback(
    (d: Department) => [d.name, d.code, d.type, d.description ?? ''],
    [],
  );

  const importColumns = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (d: Department) => d.name },
      {
        id: 'type',
        header: 'Type',
        cell: (d: Department) => (
          <Badge variant="secondary">
            {DEPARTMENT_TYPE_LABELS[d.type] ?? d.type}
          </Badge>
        ),
      },
    ],
    [],
  );

  const getRowKey = useCallback((d: Department) => d.code.toLowerCase(), []);

  const runDepartmentImport = async (selection: Department[]) => {
    try {
      const res = await platformImport.mutateAsync(selection.map((r) => r.id));
      const { created, skipped, errors } = res.data;
      const parts = [`${created.length} created`, `${skipped.length} skipped`];
      if (errors.length) parts.push(`${errors.length} failed`);
      toast.success(parts.join(', '));
      if (errors.length) {
        toast.error(errors.map((e) => e.message).join('; '));
      }
      setImportOpen(false);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  };

  const createForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: EMPTY_DEPARTMENT_FORM_VALUES,
  });

  const editForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: EMPTY_DEPARTMENT_FORM_VALUES,
  });

  const typeOptions = useMemo(() => departmentTypeSchema.options, []);

  const columns = useMemo<ColumnDef<Department, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => (
          <Badge variant="secondary">
            {DEPARTMENT_TYPE_LABELS[getValue<DepartmentType>()] ?? getValue<string>()}
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
                      next ? 'Department activated' : 'Department deactivated',
                    ),
                  onError: (err) => toast.error(mutationErrorMessage(err)),
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
            onView={() => setViewingDepartment(row.original)}
            onEdit={() => {
              setEditingDepartment(row.original);
              editForm.reset({
                name: row.original.name,
                code: row.original.code,
                type: row.original.type,
                description: row.original.description,
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
      updateMutation.isPending,
      updateMutation.variables,
    ],
  );

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Department created');
      setIsCreateOpen(false);
      createForm.reset(EMPTY_DEPARTMENT_FORM_VALUES);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editingDepartment) return;
    try {
      await updateMutation.mutateAsync({
        id: editingDepartment.id,
        input: values,
      });
      toast.success('Department updated');
      setEditingDepartment(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  return (
    <MasterDataPageShell
      section="departments"
      title="Departments"
      description={
        tenantCatalog
          ? 'Tenant department catalog: import from the platform library or add hospital-specific departments.'
          : 'Platform department definitions shared across tenants.'
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as DepartmentType | 'all')}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {typeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {DEPARTMENT_TYPE_LABELS[option] ?? option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <VisitpadHeaderActions
            catalogModuleSlug="departments"
            addLabel="Add Department"
            onAddClick={() => setIsCreateOpen(true)}
            onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
            importFromLibraryPending={platformImport.isPending}
          />
        </div>
      }
    >
      <div className="rounded-lg border">
        <div className="p-3 border-b">
          <MasterDataTableToolbar
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search name, code, type…"
          />
        </div>
        {error ? (
          <p className="p-3 text-sm text-destructive">{error.message}</p>
        ) : (
          <DataTable
            columns={columns}
            data={departments}
            isLoading={isLoading}
            emptyTitle="No departments found"
            emptyDescription="Add a department to get started, or adjust your search."
            manualPagination={{
              pageIndex,
              pageSize,
              total,
              pageSizeOptions: DEPARTMENT_CATALOG_PAGE_SIZES,
              onPageChange: setPageIndex,
              onPageSizeChange: setPageSize,
            }}
          />
        )}
      </div>

      {/* Create dialog */}
      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) createForm.reset(EMPTY_DEPARTMENT_FORM_VALUES);
        }}
        title="Add Department"
        description="Create a new hospital department."
        submitLabel="Create Department"
        isSubmitting={createMutation.isPending}
        onSubmit={onCreateSubmit}
      >
        <DepartmentFormFields form={createForm} typeOptions={typeOptions} />
      </EntityFormDialog>

      {/* Edit dialog */}
      <EntityFormDialog
        open={!!editingDepartment}
        onOpenChange={(open) => {
          if (!open) setEditingDepartment(null);
        }}
        title="Edit Department"
        description="Update department details."
        submitLabel="Save Changes"
        isSubmitting={updateMutation.isPending}
        onSubmit={onEditSubmit}
      >
        <DepartmentFormFields form={editForm} typeOptions={typeOptions} />
      </EntityFormDialog>

      {/* View dialog */}
      <Dialog
        open={!!viewingDepartment}
        onOpenChange={(open) => !open && setViewingDepartment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Department details</DialogTitle>
            <DialogDescription>Read-only department information.</DialogDescription>
          </DialogHeader>
          {viewingDepartment && (
            <div className="space-y-2 text-sm">
              <ReadOnlyRow label="Name" value={viewingDepartment.name} />
              <ReadOnlyRow label="Code" value={viewingDepartment.code} />
              <ReadOnlyRow
                label="Type"
                value={DEPARTMENT_TYPE_LABELS[viewingDepartment.type] ?? viewingDepartment.type}
              />
              <ReadOnlyRow
                label="Status"
                value={viewingDepartment.is_active ? 'Active' : 'Inactive'}
              />
              <ReadOnlyRow label="Description" value={viewingDepartment.description ?? '-'} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImportFromPlatformCatalogDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import departments from platform library"
        description="Copy selected platform departments into this tenant catalog. Already-imported codes are skipped."
        searchPlaceholder="Search name, code, type…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        rowKeyHeader="Code"
        importedKeys={importedKeys}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending}
        onImportRows={runDepartmentImport}
        libraryPagination={{
          pageIndex: libPageIndex,
          pageSize: libPageSize,
          total: globalLibTotal,
          onPageChange: setLibPageIndex,
        }}
        librarySearchControl={{
          draft: librarySearchDraft,
          onDraftChange: setLibrarySearchDraft,
        }}
      />
    </MasterDataPageShell>
  );
}

interface DepartmentFormFieldsProps {
  form: ReturnType<typeof useForm<DepartmentFormValues>>;
  typeOptions: readonly string[];
}

function DepartmentFormFields({ form, typeOptions }: DepartmentFormFieldsProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const watchedName = watch('name');
  const codeSuggestion = toSlug(watchedName).toUpperCase().replace(/-/g, '_');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dept-name">Name</Label>
          <Input
            id="dept-name"
            placeholder="e.g. Cardiology"
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dept-code">Code</Label>
          <Input
            id="dept-code"
            placeholder={codeSuggestion || 'e.g. CARDIOLOGY'}
            {...register('code')}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select department type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {DEPARTMENT_TYPE_LABELS[option as DepartmentType] ?? option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dept-description">Description (optional)</Label>
        <Textarea
          id="dept-description"
          rows={3}
          placeholder={`Describe the ${watchedName || 'department'} and its scope`}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Active</p>
          <p className="text-xs text-muted-foreground">
            Inactive departments are hidden from selection lists.
          </p>
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
