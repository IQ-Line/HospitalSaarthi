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
import { useVisitpadDelete, useVisitpadPatch, useVisitpadPost, useVisitpadProcedures } from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import {
  VISITPAD_PROCEDURE_BILLING_CATEGORIES,
  VISITPAD_PROCEDURE_CATEGORIES,
} from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadProcedure } from '@/features/visitpad/types';
import {
  visitpadProcedureEditFormSchema,
  type VisitpadProcedureEditFormSchema,
} from '@/features/visitpad/validation';

const PROC_BASE = '/api/v1/master-data/visitpad/procedures';

export const Route = createFileRoute('/_authenticated/visitpad/procedures')({
  component: VisitpadProceduresPage,
});

function VisitpadProceduresPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [billing, setBilling] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadProcedure | null>(null);
  const [deleting, setDeleting] = useState<VisitpadProcedure | null>(null);
  const cat = category === 'all' ? undefined : category;
  const bill = billing === 'all' ? undefined : billing;
  const { data, isLoading, error } = useVisitpadProcedures(search || undefined, cat, bill);
  const patch = useVisitpadPatch(PROC_BASE);
  const del = useVisitpadDelete(PROC_BASE);
  const create = useVisitpadPost(PROC_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        rowMatchesSearch(search, r.cpt_code, r.display_name, r.category, r.billing_category),
      ),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadProcedure, unknown>[]>(
    () => [
      { accessorKey: 'cpt_code', header: 'CPT', meta: { label: 'CPT' } },
      { accessorKey: 'display_name', header: 'Display', meta: { label: 'Display' } },
      {
        accessorKey: 'category',
        header: 'Category',
        meta: { label: 'Category' },
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'billing_category',
        header: 'Billing',
        meta: { label: 'Billing' },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'duration_minutes',
        header: 'Min',
        meta: { label: 'Duration (min)' },
        cell: ({ row }) => row.original.duration_minutes ?? '—',
      },
      {
        accessorKey: 'type_modality',
        header: 'Modality',
        meta: { label: 'Modality' },
        cell: ({ row }) => row.original.type_modality || <span className="text-muted-foreground">—</span>,
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
        id: 'consent',
        header: 'Consent',
        meta: { label: 'Consent' },
        cell: ({ row }) => (row.original.requires_consent ? 'Yes' : '—'),
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
      visitpadActionsColumn<VisitpadProcedure>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
      }),
    ],
    [patch, busy],
  );

  return (
    <VisitpadPageShell
      primary="procedures"
      tabCount={tabCount}
      title="Procedures"
      description="Procedure / CPT catalog for ordering and documentation."
      actions={
        <VisitpadHeaderActions addLabel="Add procedure" onAddClick={() => setCreateOpen(true)} />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search CPT, display name…"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VISITPAD_PROCEDURE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billing} onValueChange={setBilling}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="All billing types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All billing types</SelectItem>
                {VISITPAD_PROCEDURE_BILLING_CATEGORIES.map((c) => (
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
            emptyTitle="No procedures found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

      <ProcedureCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Procedure created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ProcedureEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Procedure updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete procedure"
        description={`Soft-delete CPT ${deleting?.cpt_code ?? ''} — ${deleting?.display_name ?? ''}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Procedure deleted');
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

function ProcedureCreateDialog({
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
  const [category, setCategory] = useState('diagnostic');
  const [billing, setBilling] = useState('professional');
  const [consent, setConsent] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) {
      setCategory('diagnostic');
      setBilling('professional');
      setConsent(false);
      setIsActive(true);
    }
  }, [open]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add procedure"
      description="Create a CPT procedure row."
      submitLabel="Create procedure"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const cpt_code = String(fd.get('cpt_code') ?? '').trim();
        const official_descriptor = String(fd.get('official_descriptor') ?? '').trim();
        const display_name = String(fd.get('display_name') ?? '').trim();
        const snomedRaw = String(fd.get('snomed_code') ?? '').trim();
        const duration_minutes = Number(fd.get('duration_minutes') ?? 0);
        if (!cpt_code || !official_descriptor || !display_name || Number.isNaN(duration_minutes)) {
          toast.error('CPT code, official descriptor, display name, and duration are required.');
          return;
        }
        await onSubmit({
          cpt_code,
          official_descriptor,
          display_name,
          category,
          billing_category: billing,
          duration_minutes,
          requires_consent: consent,
          type_modality: null,
          display_order: Number(fd.get('display_order') ?? 0) || 0,
          is_active: isActive,
          snomed_code: snomedRaw.length ? snomedRaw : null,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vp-pr-cpt">CPT code</Label>
          <Input id="vp-pr-cpt" name="cpt_code" required maxLength={16} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-pr-dur">Duration (minutes)</Label>
          <Input id="vp-pr-dur" name="duration_minutes" type="number" min={0} max={1440} defaultValue={15} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-pr-off">Official descriptor</Label>
          <Input id="vp-pr-off" name="official_descriptor" required maxLength={512} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-pr-disp">Display name</Label>
          <Input id="vp-pr-disp" name="display_name" required maxLength={512} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_PROCEDURE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Billing category</Label>
          <Select value={billing} onValueChange={setBilling}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_PROCEDURE_BILLING_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-pr-snomed">SNOMED code (optional)</Label>
          <Input id="vp-pr-snomed" name="snomed_code" maxLength={64} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-pr-order">Display order</Label>
          <Input id="vp-pr-order" name="display_order" type="number" defaultValue={0} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="vp-pr-consent">Requires consent</Label>
          <Switch id="vp-pr-consent" checked={consent} onCheckedChange={setConsent} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="vp-pr-act">Enabled</Label>
          <Switch id="vp-pr-act" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function ProcedureEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadProcedure | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadProcedureEditFormSchema>({
    resolver: zodResolver(visitpadProcedureEditFormSchema),
    defaultValues: {
      cpt_code: '',
      display_name: '',
      official_descriptor: '',
      category: 'diagnostic',
      billing_category: 'professional',
      duration_minutes: 15,
      requires_consent: false,
      snomed_code: null,
      type_modality: null,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        cpt_code: row.cpt_code,
        display_name: row.display_name,
        official_descriptor: row.official_descriptor ?? '',
        category: row.category as VisitpadProcedureEditFormSchema['category'],
        billing_category: row.billing_category as VisitpadProcedureEditFormSchema['billing_category'],
        duration_minutes: row.duration_minutes ?? 0,
        requires_consent: !!row.requires_consent,
        snomed_code: row.snomed_code ?? null,
        type_modality: row.type_modality ?? null,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadProcedureEditFormSchema> = async (v) => {
    const snomed = v.snomed_code?.trim();
    const mod = v.type_modality?.trim();
    await onSave({
      cpt_code: v.cpt_code,
      display_name: v.display_name,
      official_descriptor: v.official_descriptor,
      category: v.category,
      billing_category: v.billing_category,
      duration_minutes: v.duration_minutes,
      requires_consent: v.requires_consent,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
      type_modality: mod && mod.length > 0 ? mod : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit procedure — ${row.cpt_code}` : 'Edit procedure'}
      description="Update CPT metadata, timing, consent, modality, and SNOMED coding."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vp-pe-cpt">CPT code</Label>
            <Input id="vp-pe-cpt" maxLength={16} {...form.register('cpt_code')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-pe-dur">Duration (minutes)</Label>
            <Input
              id="vp-pe-dur"
              type="number"
              min={0}
              max={1440}
              {...form.register('duration_minutes', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-pe-off">Official descriptor</Label>
            <Input id="vp-pe-off" maxLength={512} {...form.register('official_descriptor')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-pe-disp">Display name</Label>
            <Input id="vp-pe-disp" maxLength={512} {...form.register('display_name')} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.watch('category')}
              onValueChange={(x) => form.setValue('category', x as VisitpadProcedureEditFormSchema['category'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_PROCEDURE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Billing category</Label>
            <Select
              value={form.watch('billing_category')}
              onValueChange={(x) =>
                form.setValue('billing_category', x as VisitpadProcedureEditFormSchema['billing_category'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_PROCEDURE_BILLING_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-pe-mod">Modality</Label>
            <Input id="vp-pe-mod" maxLength={128} {...form.register('type_modality')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-pe-snomed">SNOMED code</Label>
            <Input id="vp-pe-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-pe-order">Display order</Label>
            <Input id="vp-pe-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-pe-consent">Requires consent</Label>
            <Switch
              id="vp-pe-consent"
              checked={!!form.watch('requires_consent')}
              onCheckedChange={(c) => form.setValue('requires_consent', c)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-pe-act">Enabled</Label>
            <Switch
              id="vp-pe-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
