import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { CatalogActiveSwitch } from '@/features/visitpad/components/catalog-active-switch';
import { RequiredLabel, VISITPAD_CODE_HELPER_TEXT } from '@/features/visitpad/components/required-label';
import { useCatalogActiveToggleConfirm } from '@/features/visitpad/hooks/use-catalog-active-toggle-confirm';
import { nextDisplayOrder } from '@/features/visitpad/lib/next-display-order';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadAllergyReactions,
  useVisitpadAllergyReactionsGlobalLibrary,
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
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadAllergyReaction } from '@/features/visitpad/types';
import {
  visitpadAllergyReactionCreateFormSchema,
  visitpadAllergyReactionEditFormSchema,
  type VisitpadAllergyReactionCreateFormSchema,
  type VisitpadAllergyReactionEditFormSchema,
} from '@/features/visitpad/validation';
import { useCapability } from '@/hooks/use-capability';
import { catalogModuleSlugForVisitpadManifestNode } from '@/features/visitpad/lib/visitpad-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireVisitpadLeafRouteAccess } from '@/lib/visitpad-route-access';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const RXN_BASE = '/api/v1/master-data/visitpad/allergy-reactions';

export const Route = createFileRoute('/_authenticated/visitpad/reactions')({
  beforeLoad: requireVisitpadLeafRouteAccess('/visitpad/reactions'),
  component: VisitpadReactionsPage,
});

function VisitpadReactionsPage() {
  const catalogModuleSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-reactions');
  const { canUpdate, canMutate } = useCatalogModuleCrud(catalogModuleSlug);
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
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
  const [editing, setEditing] = useState<VisitpadAllergyReaction | null>(null);
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadAllergyReactions(search || undefined, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadAllergyReactionsGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(RXN_BASE);
  const create = useVisitpadPost(RXN_BASE);
  const platformImport = useVisitpadPlatformImport('/allergy-reactions/import-from-platform');
  const { data: tenantCodeKeys, isLoading: tenantCodeKeysLoading } = useVisitpadTenantImportKeys(
    '/allergy-reactions',
    importOpen && tenantCatalog,
  );
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || platformImport.isPending;

  const importedKeys = useMemo(() => tenantCodeKeys ?? new Set<string>(), [tenantCodeKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;
  const getRowKey = useCallback((r: VisitpadAllergyReaction) => r.code, []);

  const importSearchParts = useCallback(
    (r: VisitpadAllergyReaction) => [r.code, r.display_name],
    [],
  );

  const importColumns = useMemo(
    () => [{ id: 'name', header: 'Display name', cell: (r: VisitpadAllergyReaction) => r.display_name }],
    [],
  );

  const activeToggle = useCatalogActiveToggleConfirm({
    disabled: patch.isPending || !canUpdate,
    onConfirm: async (id, next) => {
      try {
        await patch.mutateAsync({ id, body: { is_active: next } });
        toast.success(next ? 'Reaction enabled' : 'Reaction disabled');
      } catch (e) {
        toast.error(mutationErrorMessage(e));
      }
    },
  });

  const runReactionImport = async (selection: VisitpadAllergyReaction[]) => {
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

  const columns = useMemo<ColumnDef<VisitpadAllergyReaction, unknown>[]>(
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
      { accessorKey: 'display_order', header: 'Order', meta: { label: 'Order' } },
      {
        accessorKey: 'is_active',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) =>
          activeToggle.renderToggle({
            id: row.original.id,
            displayName: row.original.display_name || row.original.code,
            isActive: row.original.is_active,
          }),
      },
      visitpadActionsColumn<VisitpadAllergyReaction>({
        onEdit: setEditing,
        disabled: busy,
        canEdit: canUpdate,
      }),
    ],
    [activeToggle, busy, canUpdate],
  );

  return (
    <VisitpadPageShell
      primary="allergies"
      tabCount={tabCount}
      breadcrumbLabel="Reactions"
      title="Allergy reactions"
      description={
        tenantCatalog
          ? 'Tenant reaction pick list: import from the platform library or add local-only codes.'
          : 'Platform reaction codes and labels for visit-pad pick lists.'
      }
      secondaryNav={<VisitpadAllergiesSecondaryNav />}
      actions={
        <VisitpadHeaderActions
          catalogModuleSlug={catalogModuleSlug}
          addLabel="Add reaction"
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={platformImport.isPending}
        />
      }
    >
      <div className="space-y-4">
        <MasterDataTableToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search code, display name, short name, SNOMED…"
        />
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <DataTable
            showColumnMenu
            columns={columns}
            data={rows}
            isLoading={isLoading}
            emptyTitle="No reactions found"
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

      <ImportFromPlatformCatalogDialog<VisitpadAllergyReaction>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import reactions from platform library"
        description="Select reactions to add to your tenant catalog. Already-imported codes are disabled."
        searchPlaceholder="Search code or display name…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        importedKeysLoading={tenantCodeKeysLoading}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runReactionImport}
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

      <ReactionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        nextOrder={nextDisplayOrder(rows)}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Reaction created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ReactionEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Reaction updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />


      <VisitpadSnomedFooter />
    </VisitpadPageShell>
  );
}

function ReactionCreateDialog({
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
  const form = useForm<VisitpadAllergyReactionCreateFormSchema>({
    resolver: zodResolver(visitpadAllergyReactionCreateFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      short_name: '',
      snomed_code: null,
      display_order: nextOrder,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: '',
        display_name: '',
        short_name: '',
        snomed_code: null,
        display_order: nextOrder,
        is_active: true,
      });
    }
  }, [open, nextOrder, form]);

  const submit: SubmitHandler<VisitpadAllergyReactionCreateFormSchema> = async (v) => {
    await onSubmit({
      code: v.code.trim(),
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      snomed_code: v.snomed_code?.trim() ? v.snomed_code.trim() : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add reaction"
      description="Stable reaction code (immutable after save), display name, optional short label and SNOMED."
      submitLabel="Add"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-rxn-code">Reaction code</RequiredLabel>
          <Input
            id="vp-rxn-code"
            maxLength={9}
            autoComplete="off"
            placeholder="e.g. rash_loc"
            {...form.register('code')}
          />
          <p className="text-xs text-muted-foreground">{VISITPAD_CODE_HELPER_TEXT}</p>
          {form.formState.errors.code ? (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-rxn-name">Display name</RequiredLabel>
          <Input
            id="vp-rxn-name"
            maxLength={256}
            placeholder="e.g. Localized rash"
            {...form.register('display_name')}
          />
          {form.formState.errors.display_name ? (
            <p className="text-xs text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-rxn-short">Short name</Label>
          <Input id="vp-rxn-short" maxLength={120} {...form.register('short_name')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-rxn-snomed">SNOMED CT</Label>
          <Input
            id="vp-rxn-snomed"
            maxLength={64}
            placeholder="Select concept…"
            {...form.register('snomed_code')}
          />
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-rxn-order">Display order</RequiredLabel>
          <Input id="vp-rxn-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          {form.formState.errors.display_order ? (
            <p className="text-xs text-destructive">{form.formState.errors.display_order.message}</p>
          ) : null}
        </div>
        <CatalogActiveSwitch
          id="vp-rxn-act"
          checked={!!form.watch('is_active')}
          onCheckedChange={(c) => form.setValue('is_active', c)}
        />
      </div>
    </EntityFormDialog>
  );
}

function ReactionEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadAllergyReaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadAllergyReactionEditFormSchema>({
    resolver: zodResolver(visitpadAllergyReactionEditFormSchema),
    defaultValues: {
      display_name: '',
      short_name: '',
      snomed_code: '',
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        display_name: row.display_name,
        short_name: row.short_name ?? '',
        snomed_code: row.snomed_code ?? '',
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadAllergyReactionEditFormSchema> = async (v) => {
    const sn = v.snomed_code?.trim();
    const sh = v.short_name?.trim();
    await onSave({
      display_name: v.display_name.trim(),
      short_name: sh && sh.length > 0 ? sh : null,
      snomed_code: sn && sn.length > 0 ? sn : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit reaction — ${row.code}` : 'Edit reaction'}
      description="Reaction code cannot be changed. Adjust display name, short name, SNOMED, list order, and active state."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Reaction code</Label>
            <Input value={row.code} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="vp-re-name">Display name</RequiredLabel>
            <Input id="vp-re-name" maxLength={256} {...form.register('display_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-re-short">Short name</Label>
            <Input id="vp-re-short" maxLength={120} {...form.register('short_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-re-snomed">SNOMED CT</Label>
            <Input id="vp-re-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="vp-re-order">Display order</RequiredLabel>
            <Input id="vp-re-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <CatalogActiveSwitch
            id="vp-re-act"
            checked={!!form.watch('is_active')}
            onCheckedChange={(c) => form.setValue('is_active', c)}
          />
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
