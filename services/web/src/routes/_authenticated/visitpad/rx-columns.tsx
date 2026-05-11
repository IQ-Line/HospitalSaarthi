import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
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
import { useVisitpadDelete, useVisitpadPatch, useVisitpadPost, useVisitpadRxColumns } from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadRxColumn } from '@/features/visitpad/types';
import {
  visitpadRxColumnEditFormSchema,
  type VisitpadRxColumnEditFormSchema,
} from '@/features/visitpad/validation';

const RX_SECTIONS = [
  { value: 'medication_type', label: 'Medication type' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'unit', label: 'Unit' },
  { value: 'diet_type', label: 'Diet type' },
  { value: 'method_strength', label: 'Method strength' },
  { value: 'route', label: 'Route' },
  { value: 'time_of_administration', label: 'Time of administration' },
] as const;

const RX_BASE = '/api/v1/master-data/visitpad/rx-columns';

export const Route = createFileRoute('/_authenticated/visitpad/rx-columns')({
  component: VisitpadRxColumnsPage,
});

function VisitpadRxColumnsPage() {
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<string>(RX_SECTIONS[0].value);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadRxColumn | null>(null);
  const [deleting, setDeleting] = useState<VisitpadRxColumn | null>(null);
  const { data, isLoading, error } = useVisitpadRxColumns(search || undefined, section);
  const patch = useVisitpadPatch(RX_BASE);
  const del = useVisitpadDelete(RX_BASE);
  const create = useVisitpadPost(RX_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const sectionLabel = RX_SECTIONS.find((s) => s.value === section)?.label ?? 'Rx column';
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () => rows.filter((r) => rowMatchesSearch(search, r.code, r.display_name, r.section)),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadRxColumn, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Name', meta: { label: 'Name' } },
      {
        accessorKey: 'section',
        header: 'Section',
        meta: { label: 'Section' },
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
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
      visitpadActionsColumn<VisitpadRxColumn>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
      }),
    ],
    [patch, busy],
  );

  return (
    <VisitpadPageShell
      primary="rx-columns"
      tabCount={tabCount}
      title="Rx columns"
      description="Picklists for medication entry by clinical section."
      actions={
        <VisitpadHeaderActions
          addLabel={`Add ${sectionLabel}`}
          onAddClick={() => setCreateOpen(true)}
        />
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex flex-row gap-1 overflow-x-auto lg:w-52 lg:flex-col lg:overflow-x-visible shrink-0 border rounded-md p-1 bg-muted/30">
          {RX_SECTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSection(s.value)}
              className={
                section === s.value
                  ? 'rounded-sm px-3 py-2 text-left text-sm transition-colors whitespace-nowrap lg:whitespace-normal bg-background font-medium text-foreground shadow-sm'
                  : 'rounded-sm px-3 py-2 text-left text-sm transition-colors whitespace-nowrap lg:whitespace-normal text-muted-foreground hover:text-foreground'
              }
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="space-y-4 flex-1 min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search name or code…"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : (
            <DataTable
              showColumnMenu
              columns={columns}
              data={filtered}
              isLoading={isLoading}
              emptyTitle="No Rx columns found"
              emptyDescription="Adjust your search or add catalog entries for this section."
            />
          )}
        </div>
      </div>

      <RxColumnCreateDialog
        section={section}
        sectionLabel={sectionLabel}
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Rx column created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <RxColumnEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Rx column updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete Rx column"
        description={`Remove “${deleting?.display_name ?? deleting?.code ?? ''}” from this catalog?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Rx column deleted');
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

function RxColumnCreateDialog({
  section,
  sectionLabel,
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: {
  section: string;
  sectionLabel: string;
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
      title={`Add ${sectionLabel}`}
      description={`New picklist entry under section "${section}".`}
      submitLabel="Create"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const display_name = String(fd.get('display_name') ?? '').trim();
        const code = String(fd.get('code') ?? '').trim();
        const extraRaw = String(fd.get('extra_unit') ?? '').trim();
        if (!display_name || !code) {
          toast.error('Name and code are required.');
          return;
        }
        await onSubmit({
          section,
          display_name,
          code,
          extra_unit: extraRaw.length ? extraRaw : null,
          display_order: Number(fd.get('display_order') ?? 0) || 0,
          is_active: isActive,
        });
      }}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="vp-rx-name">Display name</Label>
          <Input id="vp-rx-name" name="display_name" required maxLength={256} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-rx-code">Code</Label>
          <Input id="vp-rx-code" name="code" required maxLength={64} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-rx-extra">Extra unit (optional)</Label>
          <Input id="vp-rx-extra" name="extra_unit" maxLength={128} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-rx-order">Display order</Label>
          <Input id="vp-rx-order" name="display_order" type="number" defaultValue={0} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="vp-rx-act">Enabled</Label>
          <Switch id="vp-rx-act" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function RxColumnEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadRxColumn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadRxColumnEditFormSchema>({
    resolver: zodResolver(visitpadRxColumnEditFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      extra_unit: null,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        code: row.code,
        display_name: row.display_name,
        extra_unit: row.extra_unit ?? null,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadRxColumnEditFormSchema> = async (v) => {
    const ex = v.extra_unit?.trim();
    await onSave({
      code: v.code,
      display_name: v.display_name,
      extra_unit: ex && ex.length > 0 ? ex : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit Rx column — ${row.code}` : 'Edit Rx column'}
      description={row ? `Section: ${row.section}. Update labels, extra unit, and order.` : 'Update picklist entry.'}
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Input value={row.section} readOnly className="bg-muted font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-rxe-code">Code</Label>
            <Input id="vp-rxe-code" maxLength={64} {...form.register('code')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-rxe-name">Display name</Label>
            <Input id="vp-rxe-name" maxLength={256} {...form.register('display_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-rxe-extra">Extra unit</Label>
            <Input id="vp-rxe-extra" maxLength={128} {...form.register('extra_unit')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-rxe-order">Display order</Label>
            <Input id="vp-rxe-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="vp-rxe-act">Enabled</Label>
            <Switch
              id="vp-rxe-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
