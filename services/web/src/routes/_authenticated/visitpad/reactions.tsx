import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPost,
} from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VisitpadAllergiesSecondaryNav } from '@/features/visitpad/components/visitpad-secondary-link-row';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadAllergyReaction } from '@/features/visitpad/types';
import {
  visitpadAllergyReactionEditFormSchema,
  type VisitpadAllergyReactionEditFormSchema,
} from '@/features/visitpad/validation';

const RXN_BASE = '/api/v1/master-data/visitpad/allergy-reactions';

export const Route = createFileRoute('/_authenticated/visitpad/reactions')({
  component: VisitpadReactionsPage,
});

function VisitpadReactionsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadAllergyReaction | null>(null);
  const [deleting, setDeleting] = useState<VisitpadAllergyReaction | null>(null);
  const { data, isLoading, error } = useVisitpadAllergyReactions(search || undefined);
  const patch = useVisitpadPatch(RXN_BASE);
  const del = useVisitpadDelete(RXN_BASE);
  const create = useVisitpadPost(RXN_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () => rows.filter((r) => rowMatchesSearch(search, r.code, r.display_name)),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadAllergyReaction, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Name', meta: { label: 'Name' } },
      { accessorKey: 'display_order', header: 'Order', meta: { label: 'Order' } },
      {
        accessorKey: 'is_active',
        header: 'Enabled',
        meta: { label: 'Enabled' },
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
      description="Reaction terms linked to allergen documentation."
      secondaryNav={<VisitpadAllergiesSecondaryNav />}
      actions={
        <VisitpadHeaderActions addLabel="Add reaction" onAddClick={() => setCreateOpen(true)} />
      }
    >
      <div className="space-y-4">
        <MasterDataTableToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search reaction name or code…"
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
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) setIsActive(true);
  }, [open]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add reaction"
      description="Create a documented allergy reaction term."
      submitLabel="Create reaction"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const code = String(fd.get('code') ?? '').trim();
        const display_name = String(fd.get('display_name') ?? '').trim();
        if (!code || !display_name) {
          toast.error('Code and display name are required.');
          return;
        }
        await onSubmit({
          code,
          display_name,
          display_order: Number(fd.get('display_order') ?? 0) || 0,
          is_active: isActive,
        });
      }}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="vp-rxn-code">Code</Label>
          <Input id="vp-rxn-code" name="code" required maxLength={64} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-rxn-name">Display name</Label>
          <Input id="vp-rxn-name" name="display_name" required maxLength={256} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-rxn-order">Display order</Label>
          <Input id="vp-rxn-order" name="display_order" type="number" defaultValue={0} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="vp-rxn-act">Enabled</Label>
          <Switch id="vp-rxn-act" checked={isActive} onCheckedChange={setIsActive} />
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
      code: '',
      display_name: '',
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        code: row.code,
        display_name: row.display_name,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadAllergyReactionEditFormSchema> = async (v) => {
    await onSave({
      code: v.code,
      display_name: v.display_name,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit reaction — ${row.code}` : 'Edit reaction'}
      description="Update code, display label, order, and enabled state."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="vp-re-code">Code</Label>
            <Input id="vp-re-code" maxLength={64} {...form.register('code')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-re-name">Display name</Label>
            <Input id="vp-re-name" maxLength={256} {...form.register('display_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-re-order">Display order</Label>
            <Input id="vp-re-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="vp-re-act">Enabled</Label>
            <Switch
              id="vp-re-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
