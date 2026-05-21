import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
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
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadAllergens,
  useVisitpadAllergensGlobalLibrary,
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPlatformImport,
  useVisitpadPost,
  useVisitpadTenantImportKeys,
  VISITPAD_CATALOG_DEFAULT_PAGE_SIZE,
  VISITPAD_CATALOG_PAGE_SIZES,
} from '@/features/visitpad/api';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VisitpadAllergiesSecondaryNav } from '@/features/visitpad/components/visitpad-secondary-link-row';
import { VISITPAD_ALLERGEN_TYPES, VISITPAD_REACTION_SEVERITY_DEFAULTS } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadAllergen } from '@/features/visitpad/types';
import {
  visitpadAllergenCreateFormSchema,
  visitpadAllergenEditFormSchema,
  type VisitpadAllergenCreateFormSchema,
  type VisitpadAllergenEditFormSchema,
} from '@/features/visitpad/validation';
import { useAnyCapability, useCapability } from '@/hooks/use-capability';
import { MD_VISITPAD_MUTATE_ANY } from '@/lib/runtime-capability-keys';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const AG_BASE = '/api/v1/master-data/visitpad/allergens';

export const Route = createFileRoute('/_authenticated/visitpad/allergens')({
  component: VisitpadAllergensPage,
});

function VisitpadAllergensPage() {
  const mdVisitpadMutateAny = useAnyCapability(MD_VISITPAD_MUTATE_ANY);
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [allergenType, setAllergenType] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [libPageIndex, setLibPageIndex] = useState(0);
  const libPageSize = 50;
  const { librarySearch, librarySearchDraft, setLibrarySearchDraft } = useVisitpadImportLibrarySearch(
    importOpen,
    setLibPageIndex,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(VISITPAD_CATALOG_DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<VisitpadAllergen | null>(null);
  const [deleting, setDeleting] = useState<VisitpadAllergen | null>(null);
  const at = allergenType === 'all' ? undefined : allergenType;
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadAllergens(search || undefined, at, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadAllergensGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(AG_BASE);
  const del = useVisitpadDelete(AG_BASE);
  const create = useVisitpadPost(AG_BASE);
  const platformImport = useVisitpadPlatformImport('/allergens/import-from-platform');
  const { data: tenantCodeKeys } = useVisitpadTenantImportKeys('/allergens', importOpen && tenantCatalog);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || del.isPending || platformImport.isPending;

  const importedKeys = useMemo(() => tenantCodeKeys ?? new Set<string>(), [tenantCodeKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;
  const getRowKey = useCallback((r: VisitpadAllergen) => r.code, []);

  const importSearchParts = useCallback(
    (r: VisitpadAllergen) => [r.code, r.display_name, r.allergen_type, r.drug_class ?? ''],
    [],
  );

  const importColumns = useMemo(
    () => [
      { id: 'name', header: 'Display name', cell: (r: VisitpadAllergen) => r.display_name },
      { id: 'type', header: 'Type', cell: (r: VisitpadAllergen) => r.allergen_type },
    ],
    [],
  );

  const runAllergenImport = async (selection: VisitpadAllergen[]) => {
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
    } catch (e) {
      toast.error(mutationErrorMessage(e));
    }
  };

  const columns = useMemo<ColumnDef<VisitpadAllergen, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Display name', meta: { label: 'Display name' } },
      {
        accessorKey: 'allergen_type',
        header: 'Type',
        meta: { label: 'Type' },
        cell: ({ getValue }) => (
          <Badge variant="secondary">{(getValue<string>() ?? '').toUpperCase()}</Badge>
        ),
      },
      {
        accessorKey: 'snomed_code',
        header: 'SNOMED',
        meta: { label: 'SNOMED' },
        cell: ({ getValue }) => {
          const v = getValue<string | null | undefined>();
          return v ? <span className="font-mono text-xs">{v}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'reaction_severity_default',
        header: 'Default severity',
        meta: { label: 'Default severity' },
        cell: ({ row }) => {
          const v = row.original.reaction_severity_default;
          const label = VISITPAD_REACTION_SEVERITY_DEFAULTS.find((s) => s.value === v)?.label;
          return label ?? <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'drug_class',
        header: 'Drug class',
        meta: { label: 'Drug class' },
        cell: ({ row }) => row.original.drug_class ?? <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={patch.isPending || !mdVisitpadMutateAny}
            onCheckedChange={async (next) => {
              try {
                await patch.mutateAsync({ id: row.original.id, body: { is_active: next } });
                toast.success(next ? 'Enabled' : 'Disabled');
              } catch (e) {
                toast.error(mutationErrorMessage(e));
              }
            }}
          />
        ),
      },
      visitpadActionsColumn<VisitpadAllergen>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy || !mdVisitpadMutateAny,
      }),
    ],
    [patch, busy, mdVisitpadMutateAny],
  );

  return (
    <VisitpadPageShell
      primary="allergies"
      tabCount={tabCount}
      breadcrumbLabel="Allergens"
      title="Allergens"
      description={
        tenantCatalog
          ? 'Tenant allergen catalog: import from the platform library or add local-only entries.'
          : 'Platform allergen catalog: stable code, type, default reaction severity, optional SNOMED (substance/organism), optional drug class when type is drug.'
      }
      secondaryNav={<VisitpadAllergiesSecondaryNav />}
      actions={
        <VisitpadHeaderActions
addLabel={tenantCatalog ? 'Add local allergen' : 'Add allergen'}
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={platformImport.isPending}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search allergen or drug class…"
            />
            <Select value={allergenType} onValueChange={setAllergenType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {VISITPAD_ALLERGEN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <DataTable
            showColumnMenu
            columns={columns}
            data={rows}
            isLoading={isLoading}
            emptyTitle="No allergens found"
            emptyDescription="Adjust your search or add catalog entries."
            manualPagination={{
              pageIndex,
              pageSize,
              total,
              pageSizeOptions: VISITPAD_CATALOG_PAGE_SIZES,
              onPageChange: setPageIndex,
              onPageSizeChange: setPageSize,
            }}
          />
        )}
      </div>

      <ImportFromPlatformCatalogDialog<VisitpadAllergen>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import allergens from platform library"
        description="Select allergens to add to your tenant catalog. Already-imported codes are disabled."
        searchPlaceholder="Search code, display name, type…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runAllergenImport}
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

      <AllergenCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Allergen created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <AllergenEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Allergen updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete allergen"
        description={`Soft-delete “${deleting?.display_name ?? deleting?.code ?? ''}”?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Allergen deleted');
              setDeleting(null);
            } catch (e) {
              toast.error(mutationErrorMessage(e));
            }
          })();
        }}
      />

      <VisitpadSnomedFooter />
    </VisitpadPageShell>
  );
}

function AllergenCreateDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadAllergenCreateFormSchema>({
    resolver: zodResolver(visitpadAllergenCreateFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      allergen_type: '__none__',
      reaction_severity_default: 'unknown',
      snomed_code: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        code: '',
        display_name: '',
        allergen_type: '__none__',
        reaction_severity_default: 'unknown',
        snomed_code: null,
        is_active: true,
      });
    }
  }, [open, form]);

  const submit: SubmitHandler<VisitpadAllergenCreateFormSchema> = async (v) => {
    const at = v.allergen_type === '__none__' ? undefined : v.allergen_type;
    if (!at) return;
    await onSubmit({
      code: v.code.trim(),
      display_name: v.display_name.trim(),
      allergen_type: at,
      drug_class: null,
      reaction_severity_default: v.reaction_severity_default,
      display_order: 0,
      is_active: v.is_active,
      snomed_code: v.snomed_code?.trim() ? v.snomed_code.trim() : null,
    });
  };

  const typeVal = form.watch('allergen_type');

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add allergen"
      description="Stable allergy code, display name, type, default severity, and optional SNOMED. Drug class can be set when editing drug-type allergens."
      submitLabel="Add"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ag-code">Allergy code *</Label>
          <Input
            id="vp-ag-code"
            maxLength={8}
            autoComplete="off"
            placeholder="e.g. pen_allergy"
            {...form.register('code')}
          />
          <p className="text-xs text-muted-foreground">
            3–8 characters: letters, digits, underscore. Unique and cannot be edited after save.
          </p>
          {form.formState.errors.code ? (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ag-name">Display name *</Label>
          <Input
            id="vp-ag-name"
            maxLength={256}
            placeholder="e.g. Penicillin allergy"
            {...form.register('display_name')}
          />
          {form.formState.errors.display_name ? (
            <p className="text-xs text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Allergen type *</Label>
          <Select
            value={typeVal}
            onValueChange={(x) =>
              form.setValue(
                'allergen_type',
                x as VisitpadAllergenCreateFormSchema['allergen_type'],
                { shouldValidate: true },
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select type…</SelectItem>
              {VISITPAD_ALLERGEN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.allergen_type ? (
            <p className="text-xs text-destructive">{form.formState.errors.allergen_type.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Default severity</Label>
          <Select
            value={form.watch('reaction_severity_default')}
            onValueChange={(x) =>
              form.setValue('reaction_severity_default', x as VisitpadAllergenCreateFormSchema['reaction_severity_default'])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select severity…" />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_REACTION_SEVERITY_DEFAULTS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ag-snomed">SNOMED CT (substance or organism)</Label>
          <Input
            id="vp-ag-snomed"
            maxLength={64}
            placeholder="Search SNOMED concept…"
            {...form.register('snomed_code')}
          />
        </div>
        <div className="flex flex-col gap-1 rounded-md border p-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="vp-ag-act">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive items hidden from clinical forms.</p>
            </div>
            <Switch
              id="vp-ag-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      </div>
    </EntityFormDialog>
  );
}

function AllergenEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadAllergen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadAllergenEditFormSchema>({
    resolver: zodResolver(visitpadAllergenEditFormSchema),
    defaultValues: {
      display_name: '',
      allergen_type: 'drug',
      drug_class: null,
      reaction_severity_default: 'unknown',
      snomed_code: null,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        display_name: row.display_name,
        allergen_type: row.allergen_type as VisitpadAllergenEditFormSchema['allergen_type'],
        drug_class: row.drug_class ?? null,
        reaction_severity_default: (row.reaction_severity_default ??
          'unknown') as VisitpadAllergenEditFormSchema['reaction_severity_default'],
        snomed_code: row.snomed_code ?? null,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadAllergenEditFormSchema> = async (v) => {
    const dc = v.drug_class?.trim();
    const snomed = v.snomed_code?.trim();
    await onSave({
      display_name: v.display_name,
      allergen_type: v.allergen_type,
      drug_class: dc && dc.length > 0 ? dc : null,
      reaction_severity_default: v.reaction_severity_default,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit allergen — ${row.code}` : 'Edit allergen'}
      description="Allergy code cannot be changed. Optional drug class is most relevant when type is drug."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Allergy code</Label>
            <Input value={row.code} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ae-name">Display name *</Label>
            <Input id="vp-ae-name" maxLength={256} {...form.register('display_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Allergen type *</Label>
            <Select
              value={form.watch('allergen_type')}
              onValueChange={(x) => form.setValue('allergen_type', x as VisitpadAllergenEditFormSchema['allergen_type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_ALLERGEN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Default severity</Label>
            <Select
              value={form.watch('reaction_severity_default')}
              onValueChange={(x) =>
                form.setValue(
                  'reaction_severity_default',
                  x as VisitpadAllergenEditFormSchema['reaction_severity_default'],
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_REACTION_SEVERITY_DEFAULTS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ae-drug">Drug class (optional)</Label>
            <Input id="vp-ae-drug" maxLength={256} {...form.register('drug_class')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ae-snomed">SNOMED CT (substance or organism)</Label>
            <Input id="vp-ae-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ae-order">Display order</Label>
            <Input id="vp-ae-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex flex-col gap-1 rounded-md border p-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="vp-ae-act">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive items hidden from clinical forms.</p>
              </div>
              <Switch
                id="vp-ae-act"
                checked={!!form.watch('is_active')}
                onCheckedChange={(c) => form.setValue('is_active', c)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
