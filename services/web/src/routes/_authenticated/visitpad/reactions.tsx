import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { Switch } from '@pulse/ui/switch';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import {
  useVisitpadAllergyReactions,
  useVisitpadAllergyReactionsGlobalLibrary,
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPost,
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
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';
import { visitpadGlobalAllergyReactionToCreateBody } from '@/features/visitpad/lib/visitpad-global-import-payloads';

const RXN_BASE = '/api/v1/master-data/visitpad/allergy-reactions';

export const Route = createFileRoute('/_authenticated/visitpad/reactions')({
  component: VisitpadReactionsPage,
});

function VisitpadReactionsPage() {
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [editing, setEditing] = useState<VisitpadAllergyReaction | null>(null);
  const [deleting, setDeleting] = useState<VisitpadAllergyReaction | null>(null);
  const { data, isLoading, error } = useVisitpadAllergyReactions(search || undefined);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadAllergyReactionsGlobalLibrary(importOpen);
  const patch = useVisitpadPatch(RXN_BASE);
  const del = useVisitpadDelete(RXN_BASE);
  const create = useVisitpadPost(RXN_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending || importBusy;

  const importedKeys = useMemo(() => new Set(rows.map((r) => r.code)), [rows]);
  const globalRows = globalLib?.data ?? [];
  const getRowKey = useCallback((r: VisitpadAllergyReaction) => r.code, []);

  const importSearchParts = useCallback(
    (r: VisitpadAllergyReaction) => [r.code, r.display_name],
    [],
  );

  const importColumns = useMemo(
    () => [{ id: 'name', header: 'Display name', cell: (r: VisitpadAllergyReaction) => r.display_name }],
    [],
  );

  const runReactionImport = async (selection: VisitpadAllergyReaction[]) => {
    setImportBusy(true);
    try {
      for (const row of selection) {
        await create.mutateAsync(visitpadGlobalAllergyReactionToCreateBody(row));
      }
      toast.success(
        selection.length === 1 ? 'Imported 1 reaction' : `Imported ${selection.length} reactions`,
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
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={patch.isPending}
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
      visitpadActionsColumn<VisitpadAllergyReaction>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
      }),
    ],
    [patch, busy],
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
          addLabel={tenantCatalog ? 'Add local reaction' : 'Add reaction'}
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={importBusy}
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
            data={filtered}
            isLoading={isLoading}
            emptyTitle="No reactions found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

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
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={importBusy || create.isPending}
        onImportRows={runReactionImport}
      />

      <ReactionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
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

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete reaction"
        description={`Soft-delete reaction “${deleting?.display_name ?? deleting?.code ?? ''}”?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Reaction deleted');
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

function ReactionCreateDialog({
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
  const form = useForm<VisitpadAllergyReactionCreateFormSchema>({
    resolver: zodResolver(visitpadAllergyReactionCreateFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      short_name: '',
      snomed_code: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        code: '',
        display_name: '',
        short_name: '',
        snomed_code: null,
        is_active: true,
      });
    }
  }, [open, form]);

  const submit: SubmitHandler<VisitpadAllergyReactionCreateFormSchema> = async (v) => {
    await onSubmit({
      code: v.code.trim(),
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      snomed_code: v.snomed_code?.trim() ? v.snomed_code.trim() : null,
      display_order: 0,
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
          <Label htmlFor="vp-rxn-code">Reaction code *</Label>
          <Input
            id="vp-rxn-code"
            maxLength={8}
            autoComplete="off"
            placeholder="e.g. rash_loc"
            {...form.register('code')}
          />
          <p className="text-xs text-muted-foreground">
            3–8 characters: letters, digits, underscore. Unique and cannot be edited after save.
          </p>
          {form.formState.errors.code ? (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-rxn-name">Display name *</Label>
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
        <div className="flex flex-col gap-1 rounded-md border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="vp-rxn-act">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive items are hidden from visit-pad pick lists.</p>
            </div>
            <Switch
              id="vp-rxn-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
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
            <Label htmlFor="vp-re-name">Display name *</Label>
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
            <Label htmlFor="vp-re-order">Display order</Label>
            <Input id="vp-re-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex flex-col gap-1 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="vp-re-act">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive items are hidden from visit-pad pick lists.</p>
              </div>
              <Switch
                id="vp-re-act"
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
