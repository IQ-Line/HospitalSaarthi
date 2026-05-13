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
import { rowMatchesSearch } from '@/features/master-data/table-search';
import {
  useVisitpadDelete,
  useVisitpadDiagnoses,
  useVisitpadDiagnosesGlobalLibrary,
  useVisitpadPatch,
  useVisitpadPost,
} from '@/features/visitpad/api';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VISITPAD_DIAGNOSIS_CATEGORIES, VISITPAD_ICD_VERSIONS } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadDiagnosis } from '@/features/visitpad/types';
import {
  visitpadDiagnosisCreateFormSchema,
  visitpadDiagnosisEditFormSchema,
  type VisitpadDiagnosisCreateFormSchema,
  type VisitpadDiagnosisEditFormSchema,
} from '@/features/visitpad/validation';
import { useVisitpadCatalogPermission } from '@/features/visitpad/hooks/use-visitpad-catalog-permission';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';
import { visitpadGlobalDiagnosisToCreateBody } from '@/features/visitpad/lib/visitpad-global-import-payloads';

const DX_BASE = '/api/v1/master-data/visitpad/diagnoses';

export const Route = createFileRoute('/_authenticated/visitpad/diagnoses')({
  component: VisitpadDiagnosesPage,
});

function VisitpadDiagnosesPage() {
  const { canWrite, canRead } = useVisitpadCatalogPermission();
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [editing, setEditing] = useState<VisitpadDiagnosis | null>(null);
  const [deleting, setDeleting] = useState<VisitpadDiagnosis | null>(null);
  const cat = category === 'all' ? undefined : category;
  const { data, isLoading, error } = useVisitpadDiagnoses(search || undefined, cat);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadDiagnosesGlobalLibrary(importOpen);
  const patch = useVisitpadPatch(DX_BASE);
  const del = useVisitpadDelete(DX_BASE);
  const create = useVisitpadPost(DX_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending || importBusy;

  const importedKeys = useMemo(() => new Set(rows.map((r) => r.code)), [rows]);
  const globalRows = globalLib?.data ?? [];
  const getRowKey = useCallback((r: VisitpadDiagnosis) => r.code, []);

  const importSearchParts = useCallback(
    (r: VisitpadDiagnosis) => [r.code, r.display_name, r.short_name ?? '', r.snomed_code ?? ''],
    [],
  );

  const importColumns = useMemo(
    () => [
      { id: 'name', header: 'Display name', cell: (r: VisitpadDiagnosis) => r.display_name },
      {
        id: 'snomed',
        header: 'SNOMED',
        cell: (r: VisitpadDiagnosis) => r.snomed_code ?? '—',
      },
    ],
    [],
  );

  const runDiagnosisImport = async (selection: VisitpadDiagnosis[]) => {
    setImportBusy(true);
    try {
      for (const row of selection) {
        await create.mutateAsync(visitpadGlobalDiagnosisToCreateBody(row));
      }
      toast.success(
        selection.length === 1 ? 'Imported 1 diagnosis' : `Imported ${selection.length} diagnoses`,
      );
      setImportOpen(false);
    } catch (e) {
      toast.error(mutationErrorMessage(e));
    } finally {
      setImportBusy(false);
    }
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        rowMatchesSearch(search, r.code, r.display_name, r.short_name ?? '', r.snomed_code ?? ''),
      ),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadDiagnosis, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Display name', meta: { label: 'Display name' } },
      {
        accessorKey: 'short_name',
        header: 'Short name',
        meta: { label: 'Short name' },
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
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
        id: 'icd',
        header: 'ICD',
        meta: { label: 'ICD' },
        cell: ({ row }) => {
          const c = row.original.icd10_code;
          return c ? <span className="font-mono text-xs">{c}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'is_chronic_flag',
        header: 'Chronic prompt',
        meta: { label: 'Chronic prompt' },
        cell: ({ getValue }) => (getValue<boolean>() ? <Badge variant="secondary">Yes</Badge> : '—'),
      },
      {
        accessorKey: 'is_notifiable',
        header: 'Notifiable',
        meta: { label: 'Notifiable' },
        cell: ({ getValue }) => (getValue<boolean>() ? <Badge variant="destructive">Yes</Badge> : '—'),
      },
      {
        accessorKey: 'is_active',
        header: 'Enabled',
        meta: { label: 'Enabled' },
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={patch.isPending || !canWrite}
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
      visitpadActionsColumn<VisitpadDiagnosis>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy || !canWrite,
      }),
    ],
    [patch, busy, canWrite],
  );

  return (
    <VisitpadPageShell
      primary="diagnoses"
      tabCount={tabCount}
      title="Diagnosis"
      description={
        tenantCatalog
          ? 'Tenant diagnosis catalog: import from the platform library or add local-only codes.'
          : 'Platform diagnosis codes, display names, SNOMED, and chronic / notifiable flags. Optional ICD-10 enrichment when you need registry-backed rows.'
      }
      actions={
        <VisitpadHeaderActions
          canWrite={canWrite}
          canRead={canRead}
          addLabel={tenantCatalog ? 'Add local diagnosis' : 'Add diagnosis'}
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={importBusy}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search code, display name, short name, SNOMED…"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VISITPAD_DIAGNOSIS_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
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
            data={filtered}
            isLoading={isLoading}
            emptyTitle="No diagnoses found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

      <ImportFromPlatformCatalogDialog<VisitpadDiagnosis>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import diagnoses from platform library"
        description="Select diagnoses to add to your tenant catalog. Already-imported codes are disabled."
        searchPlaceholder="Search code, display name, SNOMED…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={importBusy || create.isPending}
        onImportRows={runDiagnosisImport}
      />

      <DiagnosisCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Diagnosis created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <DiagnosisEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Diagnosis updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete diagnosis"
        description={`Soft-delete ${deleting?.code ?? ''} — ${deleting?.display_name ?? ''}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Diagnosis deleted');
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

function DiagnosisCreateDialog({
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
  const form = useForm<VisitpadDiagnosisCreateFormSchema>({
    resolver: zodResolver(visitpadDiagnosisCreateFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      short_name: '',
      snomed_code: null,
      is_chronic_flag: false,
      is_notifiable: false,
      display_order: 0,
      is_active: true,
      icd10_code: '',
      icd_version: undefined,
      official_descriptor: '',
      category: undefined,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        code: '',
        display_name: '',
        short_name: '',
        snomed_code: null,
        is_chronic_flag: false,
        is_notifiable: false,
        display_order: 0,
        is_active: true,
        icd10_code: '',
        icd_version: undefined,
        official_descriptor: '',
        category: undefined,
      });
    }
  }, [open, form]);

  const submit: SubmitHandler<VisitpadDiagnosisCreateFormSchema> = async (v) => {
    const body: Record<string, unknown> = {
      code: v.code.trim(),
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      is_chronic_flag: v.is_chronic_flag,
      is_notifiable: v.is_notifiable,
      display_order: v.display_order,
      is_active: v.is_active,
      snomed_code: v.snomed_code?.trim() ? v.snomed_code.trim() : null,
    };
    const completeIcd =
      (v.icd10_code?.trim() ?? '') !== '' &&
      v.icd_version != null &&
      (v.official_descriptor?.trim() ?? '') !== '' &&
      v.category != null;
    if (completeIcd) {
      body.icd10_code = v.icd10_code!.trim();
      body.icd_version = v.icd_version;
      body.official_descriptor = v.official_descriptor!.trim();
      body.category = v.category;
    }
    await onSubmit(body);
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add diagnosis"
      description="Stable diagnosis code (immutable after save), display name, optional short label and SNOMED. ICD-10 fields are optional."
      submitLabel="Add diagnosis"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vp-dx-code">Diagnosis code *</Label>
          <Input
            id="vp-dx-code"
            maxLength={12}
            autoComplete="off"
            placeholder="e.g. htn_dx"
            {...form.register('code')}
          />
          <p className="text-xs text-muted-foreground">
            3–12 characters: letters, digits, underscore. Unique and cannot be edited after save.
          </p>
          {form.formState.errors.code ? (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-dx-order">Display order</Label>
          <Input id="vp-dx-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground">Lower numbers appear first in pick lists.</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-dx-disp">Display name *</Label>
          <Input id="vp-dx-disp" maxLength={512} placeholder="Friendly name for staff" {...form.register('display_name')} />
          {form.formState.errors.display_name ? (
            <p className="text-xs text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-dx-short">Short name</Label>
          <Input id="vp-dx-short" maxLength={120} placeholder="e.g. fvr" {...form.register('short_name')} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-dx-snomed">SNOMED CT (clinical finding)</Label>
          <Input
            id="vp-dx-snomed"
            maxLength={64}
            placeholder="Concept ID or text"
            {...form.register('snomed_code')}
          />
        </div>
        <div className="space-y-2 sm:col-span-2 rounded-md border border-dashed p-3">
          <p className="text-sm font-medium">Optional ICD-10 enrichment</p>
          <p className="text-xs text-muted-foreground mb-3">
            Use when this row maps to a registry entry. Leave blank for simple pick-list diagnoses.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vp-dx-icd">ICD-10 code</Label>
              <Input id="vp-dx-icd" maxLength={16} {...form.register('icd10_code')} />
            </div>
            <div className="space-y-2">
              <Label>ICD version</Label>
              <Select
                value={form.watch('icd_version') ?? '__none__'}
                onValueChange={(x) =>
                  form.setValue(
                    'icd_version',
                    x === '__none__' ? undefined : (x as VisitpadDiagnosisCreateFormSchema['icd_version']),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(none)</SelectItem>
                  {VISITPAD_ICD_VERSIONS.map((ver) => (
                    <SelectItem key={ver.value} value={ver.value}>
                      {ver.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vp-dx-off">Official descriptor</Label>
              <Input id="vp-dx-off" maxLength={512} {...form.register('official_descriptor')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Category</Label>
              <Select
                value={form.watch('category') ?? '__none__'}
                onValueChange={(x) =>
                  form.setValue(
                    'category',
                    x === '__none__' ? undefined : (x as VisitpadDiagnosisCreateFormSchema['category']),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(none)</SelectItem>
                  {VISITPAD_DIAGNOSIS_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.formState.errors.icd10_code?.message?.includes('ICD') ? (
            <p className="text-xs text-destructive mt-2">{form.formState.errors.icd10_code.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 rounded-md border p-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="vp-dx-chr">Chronic illness prompt</Label>
              <p className="text-xs text-muted-foreground">
                When selected in a visit, doctors can be prompted to add this to chronic illness history.
              </p>
            </div>
            <Switch
              id="vp-dx-chr"
              checked={!!form.watch('is_chronic_flag')}
              onCheckedChange={(c) => form.setValue('is_chronic_flag', c)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-md border p-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="vp-dx-not">Notifiable condition</Label>
              <p className="text-xs text-muted-foreground">
                Marks diagnoses that may require public health notification workflows.
              </p>
            </div>
            <Switch
              id="vp-dx-not"
              checked={!!form.watch('is_notifiable')}
              onCheckedChange={(c) => form.setValue('is_notifiable', c)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-md border p-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="vp-dx-act">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive entries are hidden from tenant search lists.</p>
            </div>
            <Switch
              id="vp-dx-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      </div>
    </EntityFormDialog>
  );
}

function DiagnosisEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadDiagnosis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadDiagnosisEditFormSchema>({
    resolver: zodResolver(visitpadDiagnosisEditFormSchema),
    defaultValues: {
      display_name: '',
      short_name: null,
      icd10_code: '',
      icd_version: null,
      official_descriptor: '',
      category: null,
      is_chronic_flag: false,
      is_notifiable: false,
      snomed_code: null,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        display_name: row.display_name,
        short_name: row.short_name ?? null,
        icd10_code: row.icd10_code ?? '',
        icd_version: (row.icd_version ?? null) as VisitpadDiagnosisEditFormSchema['icd_version'],
        official_descriptor: row.official_descriptor ?? '',
        category: (row.category ?? null) as VisitpadDiagnosisEditFormSchema['category'],
        is_chronic_flag: !!row.is_chronic_flag,
        is_notifiable: !!row.is_notifiable,
        snomed_code: row.snomed_code ?? null,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadDiagnosisEditFormSchema> = async (v) => {
    const completeIcd =
      (v.icd10_code?.trim() ?? '') !== '' &&
      v.icd_version != null &&
      (v.official_descriptor?.trim() ?? '') !== '' &&
      v.category != null;
    await onSave({
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      is_chronic_flag: v.is_chronic_flag,
      is_notifiable: v.is_notifiable,
      snomed_code: v.snomed_code?.trim() ? v.snomed_code.trim() : null,
      display_order: v.display_order,
      is_active: v.is_active,
      icd10_code: completeIcd ? v.icd10_code!.trim() : null,
      icd_version: completeIcd ? v.icd_version : null,
      official_descriptor: completeIcd ? v.official_descriptor!.trim() : null,
      category: completeIcd ? v.category : null,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit diagnosis — ${row.code}` : 'Edit diagnosis'}
      description="Diagnosis code cannot be changed. Optional ICD-10 enrichment can be added or cleared."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Diagnosis code</Label>
            <Input value={row.code} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-de-disp">Display name *</Label>
            <Input id="vp-de-disp" maxLength={512} {...form.register('display_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-de-short">Short name</Label>
            <Input id="vp-de-short" maxLength={120} placeholder="e.g. fvr" {...form.register('short_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-de-snomed">SNOMED CT (clinical finding)</Label>
            <Input id="vp-de-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-de-order">Display order</Label>
            <Input id="vp-de-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2 sm:col-span-2 rounded-md border border-dashed p-3">
            <p className="text-sm font-medium">ICD-10 enrichment (optional)</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vp-de-icd">ICD-10 code</Label>
                <Input id="vp-de-icd" maxLength={16} {...form.register('icd10_code')} />
              </div>
              <div className="space-y-2">
                <Label>ICD version</Label>
                <Select
                  value={form.watch('icd_version') ?? '__none__'}
                  onValueChange={(x) =>
                    form.setValue(
                      'icd_version',
                      x === '__none__' ? null : (x as VisitpadDiagnosisEditFormSchema['icd_version']),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">(none)</SelectItem>
                    {VISITPAD_ICD_VERSIONS.map((ver) => (
                      <SelectItem key={ver.value} value={ver.value}>
                        {ver.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vp-de-off">Official descriptor</Label>
                <Input id="vp-de-off" maxLength={512} {...form.register('official_descriptor')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Category</Label>
                <Select
                  value={form.watch('category') ?? '__none__'}
                  onValueChange={(x) =>
                    form.setValue(
                      'category',
                      x === '__none__' ? null : (x as VisitpadDiagnosisEditFormSchema['category']),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">(none)</SelectItem>
                    {VISITPAD_DIAGNOSIS_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.formState.errors.icd10_code ? (
              <p className="text-xs text-destructive mt-2">{form.formState.errors.icd10_code.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1 rounded-md border p-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="vp-de-chr">Chronic illness prompt</Label>
                <p className="text-xs text-muted-foreground">
                  When selected in a visit, doctors can be prompted to add this to chronic illness history.
                </p>
              </div>
              <Switch
                id="vp-de-chr"
                checked={!!form.watch('is_chronic_flag')}
                onCheckedChange={(c) => form.setValue('is_chronic_flag', c)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 rounded-md border p-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="vp-de-not">Notifiable condition</Label>
                <p className="text-xs text-muted-foreground">
                  Marks diagnoses that may require public health notification workflows.
                </p>
              </div>
              <Switch
                id="vp-de-not"
                checked={!!form.watch('is_notifiable')}
                onCheckedChange={(c) => form.setValue('is_notifiable', c)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 rounded-md border p-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="vp-de-act">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive entries are hidden from tenant search lists.</p>
              </div>
              <Switch
                id="vp-de-act"
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
