import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useForm, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pulse/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { CatalogActiveSwitch } from '@/features/visitpad/components/catalog-active-switch';
import { FormToggleRow } from '@/features/visitpad/components/form-toggle-row';
import { RequiredLabel, VISITPAD_CODE_HELPER_TEXT } from '@/features/visitpad/components/required-label';
import { useCatalogActiveToggleConfirm } from '@/features/visitpad/hooks/use-catalog-active-toggle-confirm';
import { nextDisplayOrder } from '@/features/visitpad/lib/next-display-order';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPlatformImport,
  useVisitpadPost,
  useVisitpadTenantImportKeys,
  useVisitpadUnits,
  useVisitpadVitals,
  useVisitpadVitalsGlobalLibrary,
  VISITPAD_CATALOG_DEFAULT_PAGE_SIZE,
  VISITPAD_CATALOG_PAGE_SIZES,
} from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import {
  VISITPAD_VITAL_CATEGORIES,
  VISITPAD_VITAL_DATA_TYPES,
  VISITPAD_VITAL_INPUT_METHODS,
} from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadUnit, VisitpadVital } from '@/features/visitpad/types';
import { useCapability } from '@/hooks/use-capability';
import { catalogModuleSlugForVisitpadManifestNode } from '@/features/visitpad/lib/visitpad-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireVisitpadLeafRouteAccess } from '@/lib/visitpad-route-access';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';
import { visitpadActiveUnitRows } from '@/features/visitpad/unit-catalog';
import {
  visitpadVitalCreateSchema,
  visitpadVitalEditFormSchema,
  type VisitpadVitalEditFormSchema,
} from '@/features/visitpad/validation';

const VITALS_BASE = '/api/v1/master-data/visitpad/vitals';

const VITAL_SELECT_UNSET = '__unset__';
const VITAL_PARTNER_UNSET = '__unset__';

function summarizeJson(o: Record<string, unknown> | undefined | null): string {
  if (!o || Object.keys(o).length === 0) return '—';
  const s = JSON.stringify(o);
  return s.length > 56 ? `${s.slice(0, 56)}…` : s;
}

function fdOptNum(fd: FormData, key: string): number | null {
  const s = String(fd.get(key) ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fdRangeJson(fd: FormData, minKey: string, maxKey: string): Record<string, unknown> {
  const min = fdOptNum(fd, minKey);
  const max = fdOptNum(fd, maxKey);
  if (min === null && max === null) return {};
  const o: Record<string, unknown> = {};
  if (min !== null) o.min = min;
  if (max !== null) o.max = max;
  return o;
}

function fdAllowedUnits(fd: FormData): string[] {
  const s = String(fd.get('allowed_units') ?? '').trim();
  if (!s) return [];
  return s
    .split(/[\s,]+/)
    .map((x: string) => x.trim())
    .filter(Boolean);
}

function fdOptStr(fd: FormData, key: string): string | null {
  const t = String(fd.get(key) ?? '').trim();
  return t === '' ? null : t;
}

/** Dropdown rows: `Display (code)`; optional orphan when editing a code missing from the active catalog. */
function defaultUnitSelectOptions(
  rows: VisitpadUnit[],
  orphan: { code: string; unitLabel: string } | null,
): { code: string; label: string }[] {
  const list = rows.map((u) => ({
    code: u.code,
    label: `${u.display_name} (${u.code})`,
  }));
  if (orphan?.code && !list.some((x) => x.code === orphan.code)) {
    list.unshift({
      code: orphan.code,
      label: `${orphan.unitLabel.trim() || orphan.code} (${orphan.code}) — not in catalog`,
    });
  }
  return list;
}

/** RHF `setValueAs` for the critical-range numeric inputs: blank/NaN -> null. */
function vitalCriticalSetValueAs(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : +`${v}`;
  return n !== n ? null : n;
}

function criticalCell(low: number | null | undefined, high: number | null | undefined) {
  if (low == null && high == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-mono text-xs">
      {low ?? '—'} / {high ?? '—'}
    </span>
  );
}

export const Route = createFileRoute('/_authenticated/visitpad/vitals')({
  beforeLoad: requireVisitpadLeafRouteAccess('/visitpad/vitals'),
  component: VisitpadVitalsPage,
});

function VisitpadVitalsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
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
  const [editing, setEditing] = useState<VisitpadVital | null>(null);
  const [deleting, setDeleting] = useState<VisitpadVital | null>(null);
  const catalogModuleSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-vitals');
  const { canUpdate, canDelete } = useCatalogModuleCrud(catalogModuleSlug);
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const cat = category === 'all' ? undefined : category;
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadVitals(search || undefined, cat, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadVitalsGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(VITALS_BASE);
  const del = useVisitpadDelete(VITALS_BASE);
  const create = useVisitpadPost(VITALS_BASE);
  const platformImport = useVisitpadPlatformImport('/vitals/import-from-platform');
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || del.isPending || platformImport.isPending;

  const { data: tenantCodes, isLoading: tenantCodesLoading } = useVisitpadTenantImportKeys(
    '/vitals',
    importOpen && tenantCatalog,
  );
  const importedKeys = useMemo(() => tenantCodes ?? new Set<string>(), [tenantCodes]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;

  const importSearchParts = useCallback(
    (r: VisitpadVital) => [r.code, r.name, r.category, r.unit, r.short_name],
    [],
  );

  const getRowKey = useCallback((r: VisitpadVital) => r.code, []);

  const importColumns = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (r: VisitpadVital) => r.name },
      { id: 'category', header: 'Category', cell: (r: VisitpadVital) => r.category },
      { id: 'unit', header: 'Unit', cell: (r: VisitpadVital) => r.unit },
    ],
    [],
  );

  const activeToggle = useCatalogActiveToggleConfirm({
    disabled: patch.isPending || !canUpdate,
    onConfirm: async (id, next) => {
      try {
        await patch.mutateAsync({ id, body: { is_active: next } });
        toast.success(next ? 'Vital enabled' : 'Vital disabled');
      } catch (e) {
        toast.error(mutationErrorMessage(e));
      }
    },
  });

  const runVitalImport = async (selection: VisitpadVital[]) => {
    try {
      const res = await platformImport.mutateAsync(selection.map((r) => r.id));
      const { created, skipped, errors } = res.data;
      toast.success(`${created.length} created, ${skipped.length} skipped${errors.length ? `, ${errors.length} failed` : ''}`);
      if (errors.length) toast.error(errors.map((e) => e.message).join('; '));
      setImportOpen(false);
    } catch (e) {
      toast.error(mutationErrorMessage(e));
    }
  };

  const columns = useMemo<ColumnDef<VisitpadVital, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'name', header: 'Name', meta: { label: 'Name' } },
      {
        accessorKey: 'short_name',
        header: 'Short',
        meta: { label: 'Short' },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        meta: { label: 'Category' },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'data_type',
        header: 'Type',
        meta: { label: 'Type' },
      },
      { accessorKey: 'unit', header: 'Unit', meta: { label: 'Unit' } },
      {
        accessorKey: 'snomed_observable_code',
        header: 'SNOMED',
        meta: { label: 'SNOMED' },
        cell: ({ getValue }) => {
          const v = getValue<string | null | undefined>();
          return v ? (
            <span className="font-mono text-xs">{v}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: 'normal_adult',
        header: 'Normal (adult)',
        meta: { label: 'Normal (adult)' },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {summarizeJson(row.original.normal_range_adult as Record<string, unknown> | undefined)}
          </span>
        ),
      },
      {
        id: 'critical',
        header: 'Critical',
        meta: { label: 'Critical' },
        cell: ({ row }) => criticalCell(row.original.critical_low, row.original.critical_high),
      },
      {
        id: 'paired',
        header: 'Paired',
        meta: { label: 'Paired' },
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.is_paired ? 'Yes' : '—'}
            {row.original.pair_code ? (
              <span className="text-muted-foreground"> ({row.original.pair_code})</span>
            ) : null}
          </span>
        ),
      },
      { accessorKey: 'display_order', header: 'Order', meta: { label: 'Order' } },
      {
        accessorKey: 'is_active',
        header: 'Active',
        meta: { label: 'Active' },
        cell: ({ row }) =>
          activeToggle.renderToggle({
            id: row.original.id,
            displayName: row.original.name || row.original.code,
            isActive: row.original.is_active,
          }),
      },
      visitpadActionsColumn<VisitpadVital>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
        canEdit: canUpdate,
        canDelete,
      }),
    ],
    [activeToggle, busy, canUpdate, canDelete],
  );

  return (
    <VisitpadPageShell
      primary="vitals"
      tabCount={tabCount}
      title="Vitals"
      description={
        tenantCatalog
          ? 'Tenant catalog: import definitions from the platform library or add local-only vitals.'
          : 'Clinical vital definitions and display metadata (global platform catalog).'
      }
      actions={
        <VisitpadHeaderActions
          catalogModuleSlug={catalogModuleSlug}
          addLabel="Add vital"
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={platformImport.isPending}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPageIndex(0);
              }}
              placeholder="Search code, name, unit…"
            />
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]" aria-label="Category filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VISITPAD_VITAL_CATEGORIES.map((c) => (
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
            data={rows}
            isLoading={isLoading}
            emptyTitle="No vitals found"
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

      {activeToggle.renderConfirmDialog()}

      <VitalCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        nextOrder={nextDisplayOrder(rows)}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Vital created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ImportFromPlatformCatalogDialog<VisitpadVital>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import vitals from platform library"
        description="Select vitals to add to your tenant catalog. Already-imported rows are disabled."
        searchPlaceholder="Search by name, category, unit…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        importedKeysLoading={tenantCodesLoading}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runVitalImport}
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

      <VitalEditDialog
        vital={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Vital updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete vital"
        description={`Soft-delete vital “${deleting?.code ?? ''}”?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Vital deleted');
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

function VitalCreateDialog({
  open,
  onOpenChange,
  nextOrder,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextOrder: number;
  isSubmitting: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [category, setCategory] = useState(VITAL_SELECT_UNSET);
  const [dataType, setDataType] = useState(VITAL_SELECT_UNSET);
  const [inputMethod, setInputMethod] = useState(VITAL_SELECT_UNSET);
  const [isPaired, setIsPaired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [unitLabel, setUnitLabel] = useState('');
  const [defaultUnitCode, setDefaultUnitCode] = useState('');
  const [pairCode, setPairCode] = useState(VITAL_PARTNER_UNSET);
  const [displayOrder, setDisplayOrder] = useState(nextOrder);

  const { data: unitsRes, isLoading: unitsLoading } = useVisitpadUnits(undefined, undefined, { pageIndex: 0, pageSize: 200 });
  const { data: vitalsRes, isLoading: vitalsLoading } = useVisitpadVitals(undefined, undefined, {
    pageIndex: 0,
    pageSize: 500,
  });
  const unitRows = useMemo(() => visitpadActiveUnitRows(unitsRes?.data), [unitsRes?.data]);
  const pairOptions = useMemo(() => vitalsRes?.data ?? [], [vitalsRes?.data]);
  const hasCatalogUnits = unitRows.length > 0;

  useEffect(() => {
    if (open) {
      setCategory(VITAL_SELECT_UNSET);
      setDataType(VITAL_SELECT_UNSET);
      setInputMethod(VITAL_SELECT_UNSET);
      setIsPaired(false);
      setIsActive(true);
      setUnitLabel('');
      setDefaultUnitCode('');
      setPairCode(VITAL_PARTNER_UNSET);
      setDisplayOrder(nextOrder);
    }
  }, [open, nextOrder]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add vital"
      description="Create a vital catalog entry. Only code, name, and display order are required; other fields use sensible defaults."
      submitLabel="Add vital"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const normalAdult = fdRangeJson(fd, 'normal_adult_min', 'normal_adult_max');
        const normalPaed = fdRangeJson(fd, 'normal_paed_min', 'normal_paed_max');
        const parsed = visitpadVitalCreateSchema.safeParse({
          code: String(fd.get('code') ?? '').trim(),
          name: String(fd.get('name') ?? '').trim(),
          short_name: String(fd.get('short_name') ?? '').trim(),
          category: category === VITAL_SELECT_UNSET ? undefined : category,
          data_type: dataType === VITAL_SELECT_UNSET ? undefined : dataType,
          unit: unitLabel.trim(),
          default_unit_code: defaultUnitCode.trim(),
          allowed_units: fdAllowedUnits(fd),
          critical_low: fdOptNum(fd, 'critical_low'),
          critical_high: fdOptNum(fd, 'critical_high'),
          reference_kind: 'none',
          reference_json: {},
          normal_range_adult: normalAdult,
          normal_range_paediatric: normalPaed,
          input_method: inputMethod === VITAL_SELECT_UNSET ? undefined : inputMethod,
          is_paired: isPaired,
          pair_code:
            isPaired && pairCode !== VITAL_PARTNER_UNSET && pairCode.trim()
              ? pairCode.trim()
              : null,
          display_order: displayOrder,
          is_active: isActive,
          snomed_observable_code: fdOptStr(fd, 'snomed_observable_code'),
        });
        if (!parsed.success) {
          toast.error(parsed.error.issues.map((er) => er.message).join(' '));
          return;
        }
        await onSubmit(parsed.data as Record<string, unknown>);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <RequiredLabel htmlFor="vp-v-code">Code</RequiredLabel>
          <Input id="vp-v-code" name="code" maxLength={9} autoComplete="off" />
          <p className="text-xs text-muted-foreground">{VISITPAD_CODE_HELPER_TEXT}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-short">Short name</Label>
          <Input id="vp-v-short" name="short_name" maxLength={64} />
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-v-order">Display order</RequiredLabel>
          <Input
            id="vp-v-order"
            name="display_order"
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <RequiredLabel htmlFor="vp-v-name">Name</RequiredLabel>
          <Input id="vp-v-name" name="name" maxLength={256} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={VITAL_SELECT_UNSET}>Select category</SelectItem>
              {VISITPAD_VITAL_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Data type</Label>
          <Select value={dataType} onValueChange={setDataType}>
            <SelectTrigger>
              <SelectValue placeholder="Select data type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={VITAL_SELECT_UNSET}>Select data type</SelectItem>
              {VISITPAD_VITAL_DATA_TYPES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default unit code</Label>
          {hasCatalogUnits ? (
            <Select
              value={defaultUnitCode.trim() ? defaultUnitCode : VITAL_SELECT_UNSET}
              onValueChange={(code) => {
                if (code === VITAL_SELECT_UNSET) {
                  setDefaultUnitCode('');
                  return;
                }
                setDefaultUnitCode(code);
                const row = unitRows.find((u) => u.code === code);
                if (row) setUnitLabel(row.display_name);
              }}
              disabled={unitsLoading}
            >
              <SelectTrigger id="vp-v-def">
                <SelectValue placeholder={unitsLoading ? 'Loading units…' : 'Select unit code…'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VITAL_SELECT_UNSET}>Select unit code…</SelectItem>
                {unitRows.map((u) => (
                  <SelectItem key={u.id} value={u.code}>
                    {u.display_name} ({u.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="vp-v-def"
              value={defaultUnitCode}
              onChange={(e) => setDefaultUnitCode(e.target.value)}
              maxLength={64}
              placeholder="No units in catalog — type a code"
              disabled={unitsLoading}
            />
          )}
          {!hasCatalogUnits && !unitsLoading ? (
            <p className="text-muted-foreground text-xs">
              Add units under Visitpad → Units to use the catalog dropdown.
            </p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-v-unit">Unit label</Label>
          <Input
            id="vp-v-unit"
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            maxLength={128}
            placeholder="Filled when you pick a default unit; editable"
          />
        </div>
        <div className="space-y-2">
          <Label>Input method</Label>
          <Select value={inputMethod} onValueChange={setInputMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Select input method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={VITAL_SELECT_UNSET}>Select input method</SelectItem>
              {VISITPAD_VITAL_INPUT_METHODS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-v-snomed">SNOMED observable code</Label>
          <Input
            id="vp-v-snomed"
            name="snomed_observable_code"
            maxLength={64}
            placeholder="Concept id or short text"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-v-alt-units">Allowed alternate unit codes</Label>
          <Input
            id="vp-v-alt-units"
            name="allowed_units"
            list="vp-v-alt-units-dl"
            placeholder="Comma or space separated (e.g. bpm, /min)"
          />
          <datalist id="vp-v-alt-units-dl">
            {unitRows
              .filter((u) => u.code !== defaultUnitCode)
              .map((u) => (
                <option key={u.id} value={u.code} />
              ))}
          </datalist>
          <p className="text-muted-foreground text-xs">
            Must match existing unit codes in this catalog scope.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-namin">Normal range (adult) — min</Label>
          <Input id="vp-v-namin" name="normal_adult_min" type="number" step="any" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-namax">Normal range (adult) — max</Label>
          <Input id="vp-v-namax" name="normal_adult_max" type="number" step="any" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-npmin">Normal range (paediatric) — min</Label>
          <Input id="vp-v-npmin" name="normal_paed_min" type="number" step="any" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-npmax">Normal range (paediatric) — max</Label>
          <Input id="vp-v-npmax" name="normal_paed_max" type="number" step="any" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-clow">Critical low</Label>
          <Input id="vp-v-clow" name="critical_low" type="number" step="any" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-chigh">Critical high</Label>
          <Input id="vp-v-chigh" name="critical_high" type="number" step="any" />
        </div>
        <div className="sm:col-span-2">
          <FormToggleRow
            id="vp-v-paired"
            label="Paired capture"
            description="Partner vital is required when on."
            checked={isPaired}
            onCheckedChange={setIsPaired}
          />
        </div>
        {isPaired ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-v-pair">Partner vital</Label>
            <Select
              value={pairCode.trim() && pairCode !== VITAL_PARTNER_UNSET ? pairCode : VITAL_PARTNER_UNSET}
              onValueChange={setPairCode}
              disabled={vitalsLoading}
            >
              <SelectTrigger id="vp-v-pair">
                <SelectValue placeholder={vitalsLoading ? 'Loading vitals…' : 'Select partner vital…'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VITAL_PARTNER_UNSET}>Select partner vital…</SelectItem>
                {pairOptions.map((v) => (
                  <SelectItem key={v.id} value={v.code}>
                    {v.name} ({v.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <CatalogActiveSwitch id="vp-v-act" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function VitalEditDefaultUnitField({
  form,
  unitRows,
  defaultUnitOptions,
  unitsLoading,
}: {
  form: UseFormReturn<VisitpadVitalEditFormSchema>;
  unitRows: VisitpadUnit[];
  defaultUnitOptions: { code: string; label: string }[];
  unitsLoading: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>Default unit code</Label>
      {defaultUnitOptions.length > 0 ? (
        <Select
          value={form.watch('default_unit_code')}
          onValueChange={(c) => {
            form.setValue('default_unit_code', c, { shouldDirty: true });
            const row = unitRows.find((u) => u.code === c);
            if (row) form.setValue('unit', row.display_name, { shouldDirty: true });
          }}
          disabled={unitsLoading}
        >
          <SelectTrigger id="vp-ve-def">
            <SelectValue placeholder={unitsLoading ? 'Loading units…' : 'Select unit code…'} />
          </SelectTrigger>
          <SelectContent>
            {defaultUnitOptions.map((o) => (
              <SelectItem key={o.code} value={o.code}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id="vp-ve-def"
          maxLength={64}
          {...form.register('default_unit_code')}
          disabled={unitsLoading}
        />
      )}
      {defaultUnitOptions.length === 0 && !unitsLoading ? (
        <p className="text-muted-foreground text-xs">
          Add units under Visitpad → Units to enable the catalog dropdown.
        </p>
      ) : null}
    </div>
  );
}

function VitalEditPartnerVitalField({
  form,
  vital,
  pairOptions,
  vitalsLoading,
}: {
  form: UseFormReturn<VisitpadVitalEditFormSchema>;
  vital: VisitpadVital;
  pairOptions: VisitpadVital[];
  vitalsLoading: boolean;
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="vp-ve-pair">Partner vital</Label>
      <Select
        value={
          form.watch('pair_code')?.trim() ? (form.watch('pair_code') as string) : VITAL_PARTNER_UNSET
        }
        onValueChange={(code) =>
          form.setValue('pair_code', code === VITAL_PARTNER_UNSET ? null : code, {
            shouldDirty: true,
          })
        }
        disabled={vitalsLoading}
      >
        <SelectTrigger id="vp-ve-pair">
          <SelectValue placeholder={vitalsLoading ? 'Loading vitals…' : 'Select partner vital…'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={VITAL_PARTNER_UNSET}>Select partner vital…</SelectItem>
          {pairOptions.map((v) => (
            <SelectItem key={v.id} value={v.code}>
              {v.name} ({v.code})
            </SelectItem>
          ))}
          {vital.pair_code && !pairOptions.some((v) => v.code === vital.pair_code) ? (
            <SelectItem value={vital.pair_code}>{vital.pair_code} — not in current list</SelectItem>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}

function VitalEditFields({
  form,
  vital,
  unitRows,
  defaultUnitOptions,
  pairOptions,
  unitsLoading,
  vitalsLoading,
}: {
  form: UseFormReturn<VisitpadVitalEditFormSchema>;
  vital: VisitpadVital;
  unitRows: VisitpadUnit[];
  defaultUnitOptions: { code: string; label: string }[];
  pairOptions: VisitpadVital[];
  unitsLoading: boolean;
  vitalsLoading: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>Code (read-only)</Label>
        <Input value={vital.code} readOnly className="bg-muted font-mono text-sm" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="vp-ve-name">Name</Label>
        <Input id="vp-ve-name" maxLength={256} {...form.register('name')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vp-ve-short">Short name</Label>
        <Input id="vp-ve-short" maxLength={64} {...form.register('short_name')} />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={form.watch('category')}
          onValueChange={(x) =>
            form.setValue('category', x as VisitpadVitalEditFormSchema['category'])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISITPAD_VITAL_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Data type</Label>
        <Select
          value={form.watch('data_type')}
          onValueChange={(x) =>
            form.setValue('data_type', x as VisitpadVitalEditFormSchema['data_type'])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISITPAD_VITAL_DATA_TYPES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <VitalEditDefaultUnitField
        form={form}
        unitRows={unitRows}
        defaultUnitOptions={defaultUnitOptions}
        unitsLoading={unitsLoading}
      />
      <div className="space-y-2">
        <Label htmlFor="vp-ve-unit">Unit label</Label>
        <Input id="vp-ve-unit" maxLength={128} {...form.register('unit')} />
      </div>
      <div className="space-y-2">
        <Label>Input method</Label>
        <Select
          value={form.watch('input_method')}
          onValueChange={(x) =>
            form.setValue('input_method', x as VisitpadVitalEditFormSchema['input_method'])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISITPAD_VITAL_INPUT_METHODS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="vp-ve-snomed">SNOMED observable</Label>
        <Input id="vp-ve-snomed" maxLength={64} {...form.register('snomed_observable_code')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vp-ve-cl">Critical low</Label>
        <Input
          id="vp-ve-cl"
          type="number"
          step="any"
          {...form.register('critical_low', { setValueAs: vitalCriticalSetValueAs })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vp-ve-ch">Critical high</Label>
        <Input
          id="vp-ve-ch"
          type="number"
          step="any"
          {...form.register('critical_high', { setValueAs: vitalCriticalSetValueAs })}
        />
      </div>
      <div className="sm:col-span-2">
        <FormToggleRow
          id="vp-ve-paired"
          label="Paired capture"
          description="Partner vital is required when on."
          checked={!!form.watch('is_paired')}
          onCheckedChange={(c) => form.setValue('is_paired', c)}
        />
      </div>
      {form.watch('is_paired') ? (
        <VitalEditPartnerVitalField
          form={form}
          vital={vital}
          pairOptions={pairOptions}
          vitalsLoading={vitalsLoading}
        />
      ) : null}
      <div className="space-y-2">
        <RequiredLabel htmlFor="vp-ve-order">Display order</RequiredLabel>
        <Input
          id="vp-ve-order"
          type="number"
          {...form.register('display_order', { valueAsNumber: true })}
        />
      </div>
      <div className="sm:col-span-2">
        <CatalogActiveSwitch
          id="vp-ve-act"
          checked={!!form.watch('is_active')}
          onCheckedChange={(c) => form.setValue('is_active', c)}
        />
      </div>
    </div>
  );
}

function VitalEditDialog({
  vital,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  vital: VisitpadVital | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const { data: unitsRes, isLoading: unitsLoading } = useVisitpadUnits(undefined, undefined, { pageIndex: 0, pageSize: 200 });
  const { data: vitalsRes, isLoading: vitalsLoading } = useVisitpadVitals(undefined, undefined, {
    pageIndex: 0,
    pageSize: 500,
  });
  const unitRows = useMemo(() => visitpadActiveUnitRows(unitsRes?.data), [unitsRes?.data]);
  const pairOptions = useMemo(
    () => (vitalsRes?.data ?? []).filter((v) => v.code !== vital?.code),
    [vitalsRes?.data, vital?.code],
  );
  const defaultUnitOptions = useMemo(
    () =>
      vital
        ? defaultUnitSelectOptions(unitRows, {
            code: vital.default_unit_code,
            unitLabel: vital.unit,
          })
        : defaultUnitSelectOptions(unitRows, null),
    [unitRows, vital],
  );

  const form = useForm<VisitpadVitalEditFormSchema>({
    resolver: zodResolver(visitpadVitalEditFormSchema),
    defaultValues: {
      name: '',
      short_name: '',
      category: 'vital_signs',
      data_type: 'numeric',
      unit: '',
      default_unit_code: '',
      input_method: 'manual',
      is_paired: false,
      pair_code: null,
      critical_low: null,
      critical_high: null,
      display_order: 0,
      is_active: true,
      snomed_observable_code: null,
    },
  });

  useEffect(() => {
    if (open && vital) {
      form.reset({
        name: vital.name,
        short_name: vital.short_name,
        category: vital.category as VisitpadVitalEditFormSchema['category'],
        data_type: vital.data_type as VisitpadVitalEditFormSchema['data_type'],
        unit: vital.unit,
        default_unit_code: vital.default_unit_code,
        input_method: (vital.input_method ??
          'manual') as VisitpadVitalEditFormSchema['input_method'],
        is_paired: !!vital.is_paired,
        pair_code: vital.pair_code ?? null,
        critical_low: vital.critical_low ?? null,
        critical_high: vital.critical_high ?? null,
        display_order: vital.display_order,
        is_active: vital.is_active,
        snomed_observable_code: vital.snomed_observable_code ?? null,
      });
    }
  }, [open, vital, form]);

  const submit: SubmitHandler<VisitpadVitalEditFormSchema> = async (v) => {
    const snomed = v.snomed_observable_code?.trim();
    const pair = v.pair_code?.trim();
    await onSave({
      name: v.name,
      short_name: v.short_name,
      category: v.category,
      data_type: v.data_type,
      unit: v.unit,
      default_unit_code: v.default_unit_code,
      input_method: v.input_method,
      is_paired: v.is_paired,
      pair_code: pair && pair.length > 0 ? pair : null,
      critical_low: v.critical_low,
      critical_high: v.critical_high,
      display_order: v.display_order,
      is_active: v.is_active,
      snomed_observable_code: snomed && snomed.length > 0 ? snomed : null,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={vital ? `Edit vital — ${vital.code}` : 'Edit vital'}
      description="Vital code is immutable. Adjust labels, units, references, and coding fields."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {vital ? (
        <VitalEditFields
          form={form}
          vital={vital}
          unitRows={unitRows}
          defaultUnitOptions={defaultUnitOptions}
          pairOptions={pairOptions}
          unitsLoading={unitsLoading}
          vitalsLoading={vitalsLoading}
        />
      ) : null}
    </EntityFormDialog>
  );
}
