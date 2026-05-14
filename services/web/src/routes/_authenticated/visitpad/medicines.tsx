import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type Control, type FieldPath, type FieldValues, type SubmitHandler } from 'react-hook-form';
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
import { Textarea } from '@pulse/ui/textarea';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadDelete,
  useVisitpadMedicines,
  useVisitpadMedicinesGlobalLibrary,
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
import {
  emptyMedicineCreateForm,
  emptyMedicineEditForm,
  visitpadMedicineCreatePayloadFromForm,
  visitpadMedicineEditFormFromRow,
  visitpadMedicinePatchPayloadFromForm,
} from '@/features/visitpad/medicine-create-defaults';
import {
  VISITPAD_MEDICINE_ADMIN_ROUTES,
  VISITPAD_MEDICINE_LACTATION,
  VISITPAD_MEDICINE_PEDIATRIC,
  VISITPAD_MEDICINE_PREGNANCY,
  VISITPAD_MEDICINE_SCHEDULES,
} from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadMedicine } from '@/features/visitpad/types';
import {
  visitpadMedicineCreateFormSchema,
  visitpadMedicineEditFormSchema,
  type VisitpadMedicineCreateFormInput,
  type VisitpadMedicineCreateFormSchema,
  type VisitpadMedicineEditFormInput,
  type VisitpadMedicineEditFormSchema,
} from '@/features/visitpad/validation';
import { useVisitpadCatalogPermission } from '@/features/visitpad/hooks/use-visitpad-catalog-permission';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const MED_BASE = '/api/v1/master-data/visitpad/medicines';

export const Route = createFileRoute('/_authenticated/visitpad/medicines')({
  component: VisitpadMedicinesPage,
});

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b border-border pb-4 last:border-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function VisitpadMedicinesPage() {
  const { canWrite, canRead } = useVisitpadCatalogPermission();
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [schedule, setSchedule] = useState<string>('all');
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
  const [editing, setEditing] = useState<VisitpadMedicine | null>(null);
  const [deleting, setDeleting] = useState<VisitpadMedicine | null>(null);
  const sch = schedule === 'all' ? undefined : schedule;
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadMedicines(search || undefined, sch, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadMedicinesGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(MED_BASE);
  const del = useVisitpadDelete(MED_BASE);
  const create = useVisitpadPost(MED_BASE);
  const platformImport = useVisitpadPlatformImport('/medicines/import-from-platform');
  const { data: tenantCodeKeys } = useVisitpadTenantImportKeys('/medicines', importOpen && tenantCatalog);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || del.isPending || platformImport.isPending;

  const importedKeys = useMemo(() => tenantCodeKeys ?? new Set<string>(), [tenantCodeKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;
  const getRowKey = useCallback((r: VisitpadMedicine) => r.code, []);

  const importSearchParts = useCallback(
    (r: VisitpadMedicine) => [r.code, r.display_name, r.generic_name, r.schedule],
    [],
  );

  const importColumns = useMemo(
    () => [
      { id: 'name', header: 'Medicine', cell: (r: VisitpadMedicine) => r.display_name },
      { id: 'generic', header: 'Generic', cell: (r: VisitpadMedicine) => r.generic_name },
      { id: 'sched', header: 'Schedule', cell: (r: VisitpadMedicine) => r.schedule },
    ],
    [],
  );

  const runMedicineImport = async (selection: VisitpadMedicine[]) => {
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

  const columns = useMemo<ColumnDef<VisitpadMedicine, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Medicine name', meta: { label: 'Medicine name' } },
      { accessorKey: 'generic_name', header: 'Generic', meta: { label: 'Generic' } },
      {
        accessorKey: 'drug_class',
        header: 'Class',
        meta: { label: 'Class' },
        cell: ({ row }) => row.original.drug_class ?? <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'dosage_form',
        header: 'Form',
        meta: { label: 'Form' },
        cell: ({ row }) => row.original.dosage_form ?? <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'schedule',
        header: 'Schedule',
        meta: { label: 'Schedule' },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'is_active',
        header: 'Active',
        meta: { label: 'Active' },
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={patch.isPending || !canWrite}
            onCheckedChange={async (next) => {
              try {
                await patch.mutateAsync({ id: row.original.id, body: { is_active: next } });
                toast.success(next ? 'Activated' : 'Deactivated');
              } catch (e) {
                toast.error(mutationErrorMessage(e));
              }
            }}
          />
        ),
      },
      visitpadActionsColumn<VisitpadMedicine>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy || !canWrite,
      }),
    ],
    [patch, busy, canWrite],
  );

  return (
    <VisitpadPageShell
      primary="medicines"
      tabCount={tabCount}
      title="Medicines"
      description={
        tenantCatalog
          ? 'Tenant medication catalog: import from the platform library or add local-only medicines.'
          : 'Platform medication catalog for prescribing support.'
      }
      actions={
        <VisitpadHeaderActions
          canWrite={canWrite}
          canRead={canRead}
          addLabel={tenantCatalog ? 'Add local medicine' : 'Add medicine'}
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={platformImport.isPending}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 flex-1">
            <MasterDataTableToolbar value={search} onChange={setSearch} placeholder="Search…" />
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="All schedules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schedules</SelectItem>
                {VISITPAD_MEDICINE_SCHEDULES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
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
            emptyTitle="No medicines found"
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

      <ImportFromPlatformCatalogDialog<VisitpadMedicine>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import medicines from platform library"
        description="Select medicines to add to your tenant catalog. Already-imported codes are disabled."
        searchPlaceholder="Search code, name, generic, schedule…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runMedicineImport}
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

      <MedicineCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Medicine created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <MedicineEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Medicine updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete medicine"
        description={`Soft-delete “${deleting?.display_name ?? deleting?.code ?? ''}”?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Medicine deleted');
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

function MedicineCreateDialog({
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
  const form = useForm<VisitpadMedicineCreateFormInput>({
    resolver: zodResolver(visitpadMedicineCreateFormSchema),
    defaultValues: emptyMedicineCreateForm(),
  });

  useEffect(() => {
    if (open) {
      form.reset(emptyMedicineCreateForm());
    }
  }, [open, form]);

  const submit: SubmitHandler<VisitpadMedicineCreateFormSchema> = async (v) => {
    await onSubmit(visitpadMedicineCreatePayloadFromForm(v));
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add medicine"
      description="Fields map to the Visitpad medicines API (snake_case). Medicine code cannot be changed after save."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="space-y-6">
        <FieldSection title="Identity">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-code">Medicine code *</Label>
              <Input
                id="vp-mc-code"
                placeholder="e.g. met_500_tab"
                maxLength={8}
                className="font-mono"
                {...form.register('code')}
              />
              <p className="text-sm text-muted-foreground">
                Code must be 3–8 characters, letters, digits, or underscores; unique; cannot be edited after save.
              </p>
              {form.formState.errors.code ? (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-inn">Generic name (INN) *</Label>
              <Input id="vp-mc-inn" maxLength={512} {...form.register('generic_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-dclass">Drug class *</Label>
              <Input id="vp-mc-dclass" maxLength={256} {...form.register('drug_class')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-dsub">Drug subclass</Label>
              <Input id="vp-mc-dsub" maxLength={256} {...form.register('drug_subclass')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-brands">Brand names (comma-separated)</Label>
              <Input id="vp-mc-brands" {...form.register('brand_names_csv')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-sn1">SNOMED substance (ingredient)</Label>
              <Input
                id="vp-mc-sn1"
                maxLength={64}
                placeholder="Concept ID or code"
                {...form.register('snomed_substance_code')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-sn2">SNOMED medicinal product (optional)</Label>
              <Input
                id="vp-mc-sn2"
                maxLength={64}
                placeholder="Concept ID or code"
                {...form.register('snomed_product_code')}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-dn">Display name *</Label>
              <Input id="vp-mc-dn" maxLength={512} {...form.register('display_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-sn">Short name</Label>
              <Input id="vp-mc-sn" maxLength={256} {...form.register('short_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-ord">Display order</Label>
              <Input id="vp-mc-ord" type="number" {...form.register('display_order', { valueAsNumber: true })} />
            </div>
          </div>
        </FieldSection>

        <FieldSection title="Formulation">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-form">Dosage form *</Label>
              <Input id="vp-mc-form" maxLength={128} {...form.register('dosage_form')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-routes">Routes of admin (comma-separated codes)</Label>
              <Input
                id="vp-mc-routes"
                placeholder="oral, iv, topical"
                {...form.register('routes_csv')}
              />
              <p className="text-sm text-muted-foreground">
                Use lowercase codes such as oral, iv, iv_infusion, im, sc, topical, inhaled, and others from the
                default-route list.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-sv">Strength value</Label>
              <Input id="vp-mc-sv" {...form.register('strength_value')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-su">Strength unit</Label>
              <Input id="vp-mc-su" maxLength={32} {...form.register('strength_unit')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-sd">Strength display</Label>
              <Input id="vp-mc-sd" maxLength={256} {...form.register('strength_display')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-cv">Concentration value</Label>
              <Input id="vp-mc-cv" {...form.register('concentration_value')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-cu">Concentration unit</Label>
              <Input id="vp-mc-cu" maxLength={32} {...form.register('concentration_unit')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-vol">Volume per unit (ml)</Label>
              <Input id="vp-mc-vol" {...form.register('volume_per_unit')} />
            </div>
          </div>
        </FieldSection>

        <FieldSection title="Regulatory (India-centric)">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Schedule *</Label>
              <Controller
                control={form.control}
                name="schedule"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule…" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISITPAD_MEDICINE_SCHEDULES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <ToggleRow
              control={form.control}
              name="requires_prescription"
              id="vp-mc-rx"
              label="Requires prescription"
            />
            <ToggleRow
              control={form.control}
              name="is_controlled_substance"
              id="vp-mc-cs"
              label="Controlled substance"
            />
            <ToggleRow control={form.control} name="is_narcotic" id="vp-mc-ndps" label="Narcotic (NDPS)" />
            <ToggleRow
              control={form.control}
              name="is_restricted_antibiotic"
              id="vp-mc-h1"
              label="Restricted antibiotic (H1)"
            />
          </div>
        </FieldSection>

        <FieldSection title="Clinical safety">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-ac">Allergen classes (comma-separated)</Label>
              <Input id="vp-mc-ac" {...form.register('allergen_classes_csv')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-ci">Contraindications (comma-separated)</Label>
              <Input id="vp-mc-ci" {...form.register('contraindications_csv')} />
            </div>
            <EnumSelectRow
              control={form.control}
              name="pregnancy_category"
              label="Pregnancy category"
              options={VISITPAD_MEDICINE_PREGNANCY}
            />
            <EnumSelectRow
              control={form.control}
              name="lactation_safety"
              label="Lactation safety"
              options={VISITPAD_MEDICINE_LACTATION}
            />
            <EnumSelectRow
              control={form.control}
              name="pediatric_use"
              label="Pediatric use"
              options={VISITPAD_MEDICINE_PEDIATRIC}
            />
            <div className="space-y-2">
              <Label htmlFor="vp-mc-mxdv">Max dose / day value</Label>
              <Input id="vp-mc-mxdv" {...form.register('max_dose_per_day_value')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-mxdu">Max dose / day unit</Label>
              <Input id="vp-mc-mxdu" maxLength={32} {...form.register('max_dose_per_day_unit')} />
            </div>
            <ToggleRow control={form.control} name="black_box_warning" id="vp-mc-bbw" label="Black box warning" />
          </div>
        </FieldSection>

        <FieldSection title="Rx pad defaults">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vp-mc-ddv">Default dose value</Label>
              <Input id="vp-mc-ddv" {...form.register('default_dose_value')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-ddu">Default dose unit</Label>
              <Input id="vp-mc-ddu" maxLength={32} {...form.register('default_dose_unit')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-dfq">Default frequency code</Label>
              <Input id="vp-mc-dfq" maxLength={64} {...form.register('default_frequency')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-dur">Default duration (days)</Label>
              <Input id="vp-mc-dur" {...form.register('default_duration_days')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Default route</Label>
              <Controller
                control={form.control}
                name="default_route"
                render={({ field }) => (
                  <Select
                    value={field.value && field.value.length > 0 ? field.value : '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select route…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {VISITPAD_MEDICINE_ADMIN_ROUTES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vp-mc-tq">Typical quantity</Label>
              <Input id="vp-mc-tq" {...form.register('typical_quantity')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-mc-di">Default instructions</Label>
              <Textarea id="vp-mc-di" rows={3} maxLength={1024} {...form.register('default_instructions')} />
            </div>
          </div>
        </FieldSection>

        <FieldSection title="Internal">
          <div className="space-y-2">
            <Label htmlFor="vp-mc-notes">Notes (not shown to clinicians)</Label>
            <Textarea id="vp-mc-notes" rows={3} maxLength={2048} {...form.register('notes')} />
          </div>
        </FieldSection>

        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="vp-mc-act">Active (visible in library)</Label>
            <p className="text-sm text-muted-foreground">Inactive medicines stay hidden from prescribing pickers.</p>
          </div>
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <Switch id="vp-mc-act" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function ToggleRow<T extends FieldValues>({
  control,
  name,
  id,
  label,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  id: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => <Switch id={id} checked={field.value} onCheckedChange={field.onChange} />}
      />
    </div>
  );
}

function EnumSelectRow<T extends FieldValues, V extends string>({
  control,
  name,
  label,
  options,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: readonly { value: V; label: string }[];
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}

function MedicineEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadMedicine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadMedicineEditFormInput>({
    resolver: zodResolver(visitpadMedicineEditFormSchema),
    defaultValues: emptyMedicineEditForm(),
  });

  useEffect(() => {
    if (open && row) {
      form.reset(visitpadMedicineEditFormFromRow(row));
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadMedicineEditFormSchema> = async (v) => {
    await onSave(visitpadMedicinePatchPayloadFromForm(v));
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit medicine — ${row.code}` : 'Edit medicine'}
      description="Medicine code cannot be changed. Adjust other fields as needed."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="vp-me-code-ro">Medicine code</Label>
            <Input id="vp-me-code-ro" value={row.code} readOnly className="bg-muted font-mono text-sm" />
          </div>
          <FieldSection title="Identity">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-inn">Generic name (INN) *</Label>
                <Input id="vp-me-inn" maxLength={512} {...form.register('generic_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-dclass">Drug class *</Label>
                <Input id="vp-me-dclass" maxLength={256} {...form.register('drug_class')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-dsub">Drug subclass</Label>
                <Input id="vp-me-dsub" maxLength={256} {...form.register('drug_subclass')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-brands">Brand names (comma-separated)</Label>
                <Input id="vp-me-brands" {...form.register('brand_names_csv')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-sn1">SNOMED substance</Label>
                <Input id="vp-me-sn1" maxLength={64} {...form.register('snomed_substance_code')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-sn2">SNOMED medicinal product</Label>
                <Input id="vp-me-sn2" maxLength={64} {...form.register('snomed_product_code')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-dn">Display name *</Label>
                <Input id="vp-me-dn" maxLength={512} {...form.register('display_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-sn">Short name</Label>
                <Input id="vp-me-sn" maxLength={256} {...form.register('short_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-ord">Display order</Label>
                <Input id="vp-me-ord" type="number" {...form.register('display_order', { valueAsNumber: true })} />
              </div>
            </div>
          </FieldSection>

          <FieldSection title="Formulation">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-form">Dosage form *</Label>
                <Input id="vp-me-form" maxLength={128} {...form.register('dosage_form')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-routes">Routes of admin (comma-separated)</Label>
                <Input id="vp-me-routes" {...form.register('routes_csv')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-sv">Strength value</Label>
                <Input id="vp-me-sv" {...form.register('strength_value')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-su">Strength unit</Label>
                <Input id="vp-me-su" maxLength={32} {...form.register('strength_unit')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-sd">Strength display</Label>
                <Input id="vp-me-sd" maxLength={256} {...form.register('strength_display')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-cv">Concentration value</Label>
                <Input id="vp-me-cv" {...form.register('concentration_value')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-cu">Concentration unit</Label>
                <Input id="vp-me-cu" maxLength={32} {...form.register('concentration_unit')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-vol">Volume per unit (ml)</Label>
                <Input id="vp-me-vol" {...form.register('volume_per_unit')} />
              </div>
            </div>
          </FieldSection>

          <FieldSection title="Regulatory (India-centric)">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Schedule *</Label>
                <Controller
                  control={form.control}
                  name="schedule"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VISITPAD_MEDICINE_SCHEDULES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <ToggleRow
                control={form.control}
                name="requires_prescription"
                id="vp-me-rx"
                label="Requires prescription"
              />
              <ToggleRow
                control={form.control}
                name="is_controlled_substance"
                id="vp-me-cs"
                label="Controlled substance"
              />
              <ToggleRow control={form.control} name="is_narcotic" id="vp-me-ndps" label="Narcotic (NDPS)" />
              <ToggleRow
                control={form.control}
                name="is_restricted_antibiotic"
                id="vp-me-h1"
                label="Restricted antibiotic (H1)"
              />
            </div>
          </FieldSection>

          <FieldSection title="Clinical safety">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-ac">Allergen classes (comma-separated)</Label>
                <Input id="vp-me-ac" {...form.register('allergen_classes_csv')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-ci">Contraindications (comma-separated)</Label>
                <Input id="vp-me-ci" {...form.register('contraindications_csv')} />
              </div>
              <EnumSelectRow
                control={form.control}
                name="pregnancy_category"
                label="Pregnancy category"
                options={VISITPAD_MEDICINE_PREGNANCY}
              />
              <EnumSelectRow
                control={form.control}
                name="lactation_safety"
                label="Lactation safety"
                options={VISITPAD_MEDICINE_LACTATION}
              />
              <EnumSelectRow
                control={form.control}
                name="pediatric_use"
                label="Pediatric use"
                options={VISITPAD_MEDICINE_PEDIATRIC}
              />
              <div className="space-y-2">
                <Label htmlFor="vp-me-mxdv">Max dose / day value</Label>
                <Input id="vp-me-mxdv" {...form.register('max_dose_per_day_value')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-mxdu">Max dose / day unit</Label>
                <Input id="vp-me-mxdu" maxLength={32} {...form.register('max_dose_per_day_unit')} />
              </div>
              <ToggleRow control={form.control} name="black_box_warning" id="vp-me-bbw" label="Black box warning" />
            </div>
          </FieldSection>

          <FieldSection title="Rx pad defaults">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vp-me-ddv">Default dose value</Label>
                <Input id="vp-me-ddv" {...form.register('default_dose_value')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-ddu">Default dose unit</Label>
                <Input id="vp-me-ddu" maxLength={32} {...form.register('default_dose_unit')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-dfq">Default frequency code</Label>
                <Input id="vp-me-dfq" maxLength={64} {...form.register('default_frequency')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-dur">Default duration (days)</Label>
                <Input id="vp-me-dur" {...form.register('default_duration_days')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Default route</Label>
                <Controller
                  control={form.control}
                  name="default_route"
                  render={({ field }) => (
                    <Select
                      value={field.value && field.value.length > 0 ? field.value : '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select route…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {VISITPAD_MEDICINE_ADMIN_ROUTES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp-me-tq">Typical quantity</Label>
                <Input id="vp-me-tq" {...form.register('typical_quantity')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-me-di">Default instructions</Label>
                <Textarea id="vp-me-di" rows={3} maxLength={1024} {...form.register('default_instructions')} />
              </div>
            </div>
          </FieldSection>

          <FieldSection title="Internal">
            <div className="space-y-2">
              <Label htmlFor="vp-me-notes">Notes (not shown to clinicians)</Label>
              <Textarea id="vp-me-notes" rows={3} maxLength={2048} {...form.register('notes')} />
            </div>
          </FieldSection>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="vp-me-act">Active (visible in library)</Label>
            </div>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Switch id="vp-me-act" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
