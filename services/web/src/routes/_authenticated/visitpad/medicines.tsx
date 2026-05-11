import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { useVisitpadDelete, useVisitpadMedicines, useVisitpadPatch, useVisitpadPost } from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { withMedicineCreateDefaults } from '@/features/visitpad/medicine-create-defaults';
import { VISITPAD_MEDICINE_SCHEDULES } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadMedicine } from '@/features/visitpad/types';
import {
  visitpadMedicineEditCoreSchema,
  type VisitpadMedicineEditCoreSchema,
} from '@/features/visitpad/validation';

const MED_BASE = '/api/v1/master-data/visitpad/medicines';

export const Route = createFileRoute('/_authenticated/visitpad/medicines')({
  component: VisitpadMedicinesPage,
});

function VisitpadMedicinesPage() {
  const [search, setSearch] = useState('');
  const [schedule, setSchedule] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadMedicine | null>(null);
  const [deleting, setDeleting] = useState<VisitpadMedicine | null>(null);
  const sch = schedule === 'all' ? undefined : schedule;
  const { data, isLoading, error } = useVisitpadMedicines(search || undefined, sch);
  const patch = useVisitpadPatch(MED_BASE);
  const del = useVisitpadDelete(MED_BASE);
  const create = useVisitpadPost(MED_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        rowMatchesSearch(search, r.code, r.display_name, r.generic_name, r.schedule),
      ),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadMedicine, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Name', meta: { label: 'Name' } },
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
      { accessorKey: 'display_order', header: 'Order', meta: { label: 'Order' } },
      {
        accessorKey: 'is_active',
        header: 'Active',
        meta: { label: 'Active' },
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={patch.isPending}
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
        disabled: busy,
      }),
    ],
    [patch, busy],
  );

  return (
    <VisitpadPageShell
      primary="medicines"
      tabCount={tabCount}
      title="Medicines"
      description="Medication catalog for prescribing support."
      actions={
        <VisitpadHeaderActions addLabel="Add medicine" onAddClick={() => setCreateOpen(true)} />
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
            data={filtered}
            isLoading={isLoading}
            emptyTitle="No medicines found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

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
  const [schedule, setSchedule] = useState('otc');

  useEffect(() => {
    if (!open) setSchedule('otc');
  }, [open]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add medicine"
      description="Minimal create — extend with strength, routes, and codes after save via edit when the form ships."
      submitLabel="Create medicine"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const code = String(fd.get('code') ?? '').trim();
        const display_name = String(fd.get('display_name') ?? '').trim();
        const generic_name = String(fd.get('generic_name') ?? '').trim();
        const drug_class = String(fd.get('drug_class') ?? '').trim();
        const dosage_form = String(fd.get('dosage_form') ?? '').trim();
        if (!code || !display_name || !generic_name || !drug_class || !dosage_form) {
          toast.error('Code, display name, generic name, drug class, and dosage form are required.');
          return;
        }
        await onSubmit(
          withMedicineCreateDefaults({
            code,
            display_name,
            generic_name,
            drug_class,
            dosage_form,
            schedule,
          }),
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vp-med-code">Code</Label>
          <Input id="vp-med-code" name="code" required maxLength={64} />
        </div>
        <div className="space-y-2">
          <Label>Schedule</Label>
          <Select value={schedule} onValueChange={setSchedule}>
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
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-med-dn">Display name</Label>
          <Input id="vp-med-dn" name="display_name" required maxLength={512} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-med-gen">Generic name</Label>
          <Input id="vp-med-gen" name="generic_name" required maxLength={512} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-med-class">Drug class</Label>
          <Input id="vp-med-class" name="drug_class" required maxLength={256} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-med-form">Dosage form</Label>
          <Input id="vp-med-form" name="dosage_form" required maxLength={128} />
        </div>
      </div>
    </EntityFormDialog>
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
  const form = useForm<VisitpadMedicineEditCoreSchema>({
    resolver: zodResolver(visitpadMedicineEditCoreSchema),
    defaultValues: {
      code: '',
      display_name: '',
      generic_name: '',
      drug_class: '',
      dosage_form: '',
      schedule: 'otc',
      is_active: true,
      display_order: 0,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        code: row.code,
        display_name: row.display_name,
        generic_name: row.generic_name,
        drug_class: row.drug_class?.trim() || 'Unspecified',
        dosage_form: row.dosage_form?.trim() || 'Unspecified',
        schedule: row.schedule as VisitpadMedicineEditCoreSchema['schedule'],
        is_active: row.is_active,
        display_order: row.display_order,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadMedicineEditCoreSchema> = async (v) => {
    await onSave({
      code: v.code,
      display_name: v.display_name,
      generic_name: v.generic_name,
      drug_class: v.drug_class,
      dosage_form: v.dosage_form,
      schedule: v.schedule,
      is_active: v.is_active,
      display_order: v.display_order,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit medicine — ${row.code}` : 'Edit medicine'}
      description="Update core catalog fields. Full strength / route arrays can be extended later."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vp-me-code">Code</Label>
            <Input id="vp-me-code" maxLength={64} {...form.register('code')} />
          </div>
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select
              value={form.watch('schedule')}
              onValueChange={(x) => form.setValue('schedule', x as VisitpadMedicineEditCoreSchema['schedule'])}
            >
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
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-me-dn">Display name</Label>
            <Input id="vp-me-dn" maxLength={512} {...form.register('display_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-me-gen">Generic name</Label>
            <Input id="vp-me-gen" maxLength={512} {...form.register('generic_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-me-class">Drug class</Label>
            <Input id="vp-me-class" maxLength={256} {...form.register('drug_class')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-me-form">Dosage form</Label>
            <Input id="vp-me-form" maxLength={128} {...form.register('dosage_form')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-me-order">Display order</Label>
            <Input id="vp-me-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-me-act">Active</Label>
            <Switch
              id="vp-me-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
