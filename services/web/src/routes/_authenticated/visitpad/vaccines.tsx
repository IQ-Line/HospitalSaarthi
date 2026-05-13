import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
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
import {
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPost,
  useVisitpadVaccines,
} from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadVaccine } from '@/features/visitpad/types';
import {
  visitpadVaccineCreateFormSchema,
  visitpadVaccineEditFormSchema,
  type VisitpadVaccineCreateFormSchema,
  type VisitpadVaccineEditFormSchema,
} from '@/features/visitpad/validation';

const VA_BASE = '/api/v1/master-data/visitpad/vaccines';

export const Route = createFileRoute('/_authenticated/visitpad/vaccines')({
  component: VisitpadVaccinesPage,
});

function VisitpadVaccinesPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadVaccine | null>(null);
  const [deleting, setDeleting] = useState<VisitpadVaccine | null>(null);
  const { data, isLoading, error } = useVisitpadVaccines(search || undefined);
  const patch = useVisitpadPatch(VA_BASE);
  const del = useVisitpadDelete(VA_BASE);
  const create = useVisitpadPost(VA_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending;

  const columns = useMemo<ColumnDef<VisitpadVaccine, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Vaccine code', meta: { label: 'Vaccine code' } },
      { accessorKey: 'display_name', header: 'Vaccine', meta: { label: 'Vaccine' } },
      {
        accessorKey: 'short_name',
        header: 'Short name',
        meta: { label: 'Short name' },
        cell: ({ row }) =>
          row.original.short_name || <span className="text-muted-foreground">—</span>,
      },
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
      visitpadActionsColumn<VisitpadVaccine>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
      }),
    ],
    [patch, busy],
  );

  return (
    <VisitpadPageShell
      primary="vaccines"
      tabCount={tabCount}
      title="Vaccines"
      description="Vaccine catalog for Visitpad (stable code, display name, optional short name). Global rows omit iq_tenant_id; tenant rows use the standard catalog header."
      actions={
        <VisitpadHeaderActions addLabel="Add vaccine" onAddClick={() => setCreateOpen(true)} />
      }
    >
      <div className="space-y-4">
        <MasterDataTableToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search code, display name, short name…"
        />
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <DataTable
            showColumnMenu
            columns={columns}
            data={rows}
            isLoading={isLoading}
            emptyTitle="No vaccines found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

      <VaccineCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Vaccine created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <VaccineEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Vaccine updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete vaccine"
        description={`Remove “${deleting?.display_name ?? deleting?.code ?? ''}” from this catalog?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Vaccine deleted');
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

function VaccineCreateDialog({
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
  const form = useForm<VisitpadVaccineCreateFormSchema>({
    resolver: zodResolver(visitpadVaccineCreateFormSchema),
    defaultValues: { code: '', display_name: '', short_name: '', is_active: true },
  });

  useEffect(() => {
    if (open) {
      form.reset({ code: '', display_name: '', short_name: '', is_active: true });
    }
  }, [open, form]);

  const submit: SubmitHandler<VisitpadVaccineCreateFormSchema> = async (v) => {
    await onSubmit({
      code: v.code,
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      display_order: 0,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add vaccine"
      description="Code is immutable after save. Use letters, digits, or underscore (1–64 characters). Stored lowercase."
      submitLabel="Add"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vaccine-code">Vaccine code *</Label>
          <Input id="vaccine-code" placeholder="e.g. cov_mrna" {...form.register('code')} />
          {form.formState.errors.code ? (
            <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Code must be 1–64 characters: letters, digits, and underscore. Saved lowercase. Unique
              per catalog scope.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vaccine-display">Vaccine display name *</Label>
          <Input
            id="vaccine-display"
            placeholder="e.g. COVID-19 mRNA vaccine"
            {...form.register('display_name')}
          />
          {form.formState.errors.display_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vaccine-short">Vaccine short name</Label>
          <Input id="vaccine-short" {...form.register('short_name')} />
          <p className="text-xs text-muted-foreground">Optional.</p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">
              Inactive items are hidden from visit-pad pick lists.
            </p>
          </div>
          <Controller
            name="is_active"
            control={form.control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function VaccineEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadVaccine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadVaccineEditFormSchema>({
    resolver: zodResolver(visitpadVaccineEditFormSchema),
    defaultValues: {
      display_name: '',
      short_name: '',
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (row && open) {
      form.reset({
        display_name: row.display_name,
        short_name: row.short_name ?? '',
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [row, open, form]);

  if (!row) return null;

  const submit: SubmitHandler<VisitpadVaccineEditFormSchema> = async (v) => {
    await onSave({
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit vaccine"
      description={`Code: ${row.code} (cannot be changed)`}
      submitLabel="Save"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-vaccine-display">Vaccine display name *</Label>
          <Input id="edit-vaccine-display" {...form.register('display_name')} />
          {form.formState.errors.display_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-vaccine-short">Vaccine short name</Label>
          <Input id="edit-vaccine-short" {...form.register('short_name')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-vaccine-order">Display order</Label>
          <Input
            id="edit-vaccine-order"
            type="number"
            {...form.register('display_order', { valueAsNumber: true })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <p className="text-sm font-medium">Active</p>
          <Controller
            name="is_active"
            control={form.control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </EntityFormDialog>
  );
}
