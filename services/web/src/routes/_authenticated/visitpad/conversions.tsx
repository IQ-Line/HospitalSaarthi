import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import {
  useVisitpadConversions,
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPost,
} from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VisitpadUnitsSecondaryNav } from '@/features/visitpad/components/visitpad-secondary-link-row';
import type { VisitpadUnitConversion } from '@/features/visitpad/types';
import {
  visitpadUnitConversionCreateSchema,
  visitpadUnitConversionEditFormSchema,
  type VisitpadUnitConversionCreateSchema,
  type VisitpadUnitConversionEditFormSchema,
} from '@/features/visitpad/validation';

const CONV_BASE = '/api/v1/master-data/visitpad/unit-conversions';

export const Route = createFileRoute('/_authenticated/visitpad/conversions')({
  component: VisitpadConversionsPage,
});

function VisitpadConversionsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadUnitConversion | null>(null);
  const [deleting, setDeleting] = useState<VisitpadUnitConversion | null>(null);
  const { data, isLoading, error } = useVisitpadConversions(search || undefined);
  const create = useVisitpadPost(CONV_BASE);
  const patch = useVisitpadPatch(CONV_BASE);
  const del = useVisitpadDelete(CONV_BASE);
  const rows = data?.data ?? [];
  const tabCount = { active: rows.length, total: data?.total ?? rows.length };
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        rowMatchesSearch(search, r.from_unit_code, r.to_unit_code, String(r.factor)),
      ),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadUnitConversion, unknown>[]>(
    () => [
      { accessorKey: 'from_unit_code', header: 'From', meta: { label: 'From' } },
      { accessorKey: 'to_unit_code', header: 'To', meta: { label: 'To' } },
      { accessorKey: 'factor', header: 'Factor', meta: { label: 'Factor' } },
      { accessorKey: 'offset_value', header: 'Offset', meta: { label: 'Offset' } },
      { accessorKey: 'display_order', header: 'Order', meta: { label: 'Order' } },
      visitpadActionsColumn<VisitpadUnitConversion>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
      }),
    ],
    [busy],
  );

  return (
    <VisitpadPageShell
      primary="units"
      breadcrumbLabel="Conversions"
      tabCount={tabCount}
      title="Unit conversions"
      description="Linear conversion: value_to = value_from × factor + offset (additive)."
      secondaryNav={<VisitpadUnitsSecondaryNav />}
      actions={
        <VisitpadHeaderActions addLabel="Add conversion" onAddClick={() => setCreateOpen(true)} />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Formula: <span className="font-mono">value_to = value_from × factor + offset</span>
        </p>
        <MasterDataTableToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search unit code or label…"
        />
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <DataTable
            showColumnMenu
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            emptyTitle="No conversions found"
            emptyDescription="Adjust your search or add conversion rules in the catalog."
          />
        )}
      </div>

      <ConversionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Conversion created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConversionEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Conversion updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete conversion"
        description={`Remove mapping ${deleting?.from_unit_code ?? ''} → ${deleting?.to_unit_code ?? ''}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Conversion deleted');
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

function ConversionCreateDialog({
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
  const form = useForm<VisitpadUnitConversionCreateSchema>({
    resolver: zodResolver(visitpadUnitConversionCreateSchema),
    defaultValues: {
      from_unit_code: '',
      to_unit_code: '',
      factor: 1,
      offset_value: 0,
      display_order: 0,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ from_unit_code: '', to_unit_code: '', factor: 1, offset_value: 0, display_order: 0 });
    }
  }, [open, form]);

  const submit: SubmitHandler<VisitpadUnitConversionCreateSchema> = async (v) => {
    await onSubmit({
      ...v,
      offset_value: v.offset_value ?? 0,
      display_order: v.display_order ?? 0,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add conversion"
      description="Define a linear mapping between two unit codes. From and to must differ."
      submitLabel="Create conversion"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vp-c-from">From unit code</Label>
          <Input id="vp-c-from" maxLength={64} {...form.register('from_unit_code')} />
          {form.formState.errors.from_unit_code ? (
            <p className="text-xs text-destructive">{form.formState.errors.from_unit_code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-c-to">To unit code</Label>
          <Input id="vp-c-to" maxLength={64} {...form.register('to_unit_code')} />
          {form.formState.errors.to_unit_code ? (
            <p className="text-xs text-destructive">{form.formState.errors.to_unit_code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-c-factor">Factor</Label>
          <Input id="vp-c-factor" type="number" step="any" {...form.register('factor', { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-c-off">Offset</Label>
          <Input id="vp-c-off" type="number" step="any" {...form.register('offset_value', { valueAsNumber: true })} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-c-order">Display order</Label>
          <Input id="vp-c-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function ConversionEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadUnitConversion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadUnitConversionEditFormSchema>({
    resolver: zodResolver(visitpadUnitConversionEditFormSchema),
    defaultValues: {
      from_unit_code: '',
      to_unit_code: '',
      factor: 1,
      offset_value: 0,
      display_order: 0,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        from_unit_code: row.from_unit_code,
        to_unit_code: row.to_unit_code,
        factor: row.factor,
        offset_value: row.offset_value,
        display_order: row.display_order,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadUnitConversionEditFormSchema> = async (v) => {
    await onSave({
      from_unit_code: v.from_unit_code,
      to_unit_code: v.to_unit_code,
      factor: v.factor,
      offset_value: v.offset_value,
      display_order: v.display_order,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit conversion"
      description="Adjust from/to codes, factor, offset, or display order."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>From unit code</Label>
            <Input maxLength={64} {...form.register('from_unit_code')} />
          </div>
          <div className="space-y-2">
            <Label>To unit code</Label>
            <Input maxLength={64} {...form.register('to_unit_code')} />
          </div>
          <div className="space-y-2">
            <Label>Factor</Label>
            <Input type="number" step="any" {...form.register('factor', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label>Offset</Label>
            <Input type="number" step="any" {...form.register('offset_value', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Display order</Label>
            <Input type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
