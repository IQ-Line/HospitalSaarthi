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
import { Textarea } from '@pulse/ui/textarea';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import {
  useVisitpadChiefComplaints,
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPost,
} from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VISITPAD_BODY_SYSTEMS, VISITPAD_TRIAGE_PRIORITIES } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadChiefComplaint } from '@/features/visitpad/types';
import {
  visitpadChiefComplaintEditFormSchema,
  type VisitpadChiefComplaintEditFormSchema,
} from '@/features/visitpad/validation';

const CC_BASE = '/api/v1/master-data/visitpad/chief-complaints';

export const Route = createFileRoute('/_authenticated/visitpad/chief-complaints')({
  component: VisitpadChiefComplaintsPage,
});

function VisitpadChiefComplaintsPage() {
  const [search, setSearch] = useState('');
  const [bodySystem, setBodySystem] = useState<string>('all');
  const [triage, setTriage] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadChiefComplaint | null>(null);
  const [deleting, setDeleting] = useState<VisitpadChiefComplaint | null>(null);
  const bs = bodySystem === 'all' ? undefined : bodySystem;
  const tr = triage === 'all' ? undefined : triage;
  const { data, isLoading, error } = useVisitpadChiefComplaints(search || undefined, bs, tr);
  const patch = useVisitpadPatch(CC_BASE);
  const del = useVisitpadDelete(CC_BASE);
  const create = useVisitpadPost(CC_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        rowMatchesSearch(search, r.code, r.display_name, r.body_system, r.triage_priority),
      ),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadChiefComplaint, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Display', meta: { label: 'Display' } },
      {
        accessorKey: 'body_system',
        header: 'System',
        meta: { label: 'System' },
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'triage_priority',
        header: 'Triage',
        meta: { label: 'Triage' },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
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
        id: 'synonyms',
        header: 'Synonyms',
        meta: { label: 'Synonyms' },
        cell: ({ row }) => {
          const s = row.original.synonyms;
          if (!s?.length) return <span className="text-muted-foreground">—</span>;
          return <span className="text-xs text-muted-foreground">{s.slice(0, 3).join(', ')}{s.length > 3 ? '…' : ''}</span>;
        },
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
      visitpadActionsColumn<VisitpadChiefComplaint>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
      }),
    ],
    [patch, busy],
  );

  return (
    <VisitpadPageShell
      primary="chief-complaints"
      tabCount={tabCount}
      title="Chief complaints"
      description="Complaint catalog for triage and documentation."
      actions={
        <VisitpadHeaderActions addLabel="Add complaint" onAddClick={() => setCreateOpen(true)} />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search by name or synonym…"
            />
            <Select value={bodySystem} onValueChange={setBodySystem}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="All systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All systems</SelectItem>
                {VISITPAD_BODY_SYSTEMS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={triage} onValueChange={setTriage}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="All triage priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All triage priorities</SelectItem>
                {VISITPAD_TRIAGE_PRIORITIES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
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
            emptyTitle="No chief complaints found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

      <ChiefComplaintCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Chief complaint created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ChiefComplaintEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Chief complaint updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete chief complaint"
        description={`Soft-delete “${deleting?.display_name ?? deleting?.code ?? ''}”?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Chief complaint deleted');
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

function ChiefComplaintCreateDialog({
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
  const [bodySystem, setBodySystem] = useState('cardiovascular');
  const [triage, setTriage] = useState('routine');
  const [paed, setPaed] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) {
      setBodySystem('cardiovascular');
      setTriage('routine');
      setPaed(false);
      setIsActive(true);
    }
  }, [open]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add chief complaint"
      description="Create a complaint row. Synonyms can be added later via edit when supported."
      submitLabel="Create complaint"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const code = String(fd.get('code') ?? '').trim();
        const display_name = String(fd.get('display_name') ?? '').trim();
        const snomedRaw = String(fd.get('snomed_code') ?? '').trim();
        if (!code || !display_name) {
          toast.error('Code and display name are required.');
          return;
        }
        await onSubmit({
          code,
          display_name,
          body_system: bodySystem,
          triage_priority: triage,
          synonyms: [] as string[],
          is_paediatric_relevant: paed,
          display_order: Number(fd.get('display_order') ?? 0) || 0,
          is_active: isActive,
          snomed_code: snomedRaw.length ? snomedRaw : null,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vp-cc-code">Code</Label>
          <Input id="vp-cc-code" name="code" required maxLength={64} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-cc-name">Display name</Label>
          <Input id="vp-cc-name" name="display_name" required maxLength={256} />
        </div>
        <div className="space-y-2">
          <Label>Body system</Label>
          <Select value={bodySystem} onValueChange={setBodySystem}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_BODY_SYSTEMS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Triage priority</Label>
          <Select value={triage} onValueChange={setTriage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_TRIAGE_PRIORITIES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-cc-snomed">SNOMED code (optional)</Label>
          <Input id="vp-cc-snomed" name="snomed_code" maxLength={64} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-cc-order">Display order</Label>
          <Input id="vp-cc-order" name="display_order" type="number" defaultValue={0} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <Label htmlFor="vp-cc-paed">Paediatric relevant</Label>
          <Switch id="vp-cc-paed" checked={paed} onCheckedChange={setPaed} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <Label htmlFor="vp-cc-act">Enabled</Label>
          <Switch id="vp-cc-act" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function ChiefComplaintEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadChiefComplaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadChiefComplaintEditFormSchema>({
    resolver: zodResolver(visitpadChiefComplaintEditFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      body_system: 'cardiovascular',
      triage_priority: 'routine',
      snomed_code: null,
      is_paediatric_relevant: false,
      display_order: 0,
      is_active: true,
      synonyms_text: '',
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        code: row.code,
        display_name: row.display_name,
        body_system: row.body_system as VisitpadChiefComplaintEditFormSchema['body_system'],
        triage_priority: row.triage_priority as VisitpadChiefComplaintEditFormSchema['triage_priority'],
        snomed_code: row.snomed_code ?? null,
        is_paediatric_relevant: !!row.is_paediatric_relevant,
        display_order: row.display_order,
        is_active: row.is_active,
        synonyms_text: (row.synonyms ?? []).join('\n'),
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadChiefComplaintEditFormSchema> = async (v) => {
    const snomed = v.snomed_code?.trim();
    const synonyms = (v.synonyms_text ?? '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    await onSave({
      code: v.code,
      display_name: v.display_name,
      body_system: v.body_system,
      triage_priority: v.triage_priority,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
      is_paediatric_relevant: v.is_paediatric_relevant,
      display_order: v.display_order,
      is_active: v.is_active,
      synonyms,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit chief complaint — ${row.code}` : 'Edit chief complaint'}
      description="Update catalog fields and synonym list (one per line or comma-separated)."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vp-ce-code">Code</Label>
            <Input id="vp-ce-code" maxLength={64} {...form.register('code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-name">Display name</Label>
            <Input id="vp-ce-name" maxLength={256} {...form.register('display_name')} />
          </div>
          <div className="space-y-2">
            <Label>Body system</Label>
            <Select
              value={form.watch('body_system')}
              onValueChange={(x) => form.setValue('body_system', x as VisitpadChiefComplaintEditFormSchema['body_system'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_BODY_SYSTEMS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Triage priority</Label>
            <Select
              value={form.watch('triage_priority')}
              onValueChange={(x) =>
                form.setValue('triage_priority', x as VisitpadChiefComplaintEditFormSchema['triage_priority'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_TRIAGE_PRIORITIES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-snomed">SNOMED code</Label>
            <Input id="vp-ce-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-syn">Synonyms (one per line)</Label>
            <Textarea id="vp-ce-syn" rows={4} className="font-mono text-sm" {...form.register('synonyms_text')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-order">Display order</Label>
            <Input id="vp-ce-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-ce-paed">Paediatric relevant</Label>
            <Switch
              id="vp-ce-paed"
              checked={!!form.watch('is_paediatric_relevant')}
              onCheckedChange={(c) => form.setValue('is_paediatric_relevant', c)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-ce-act">Enabled</Label>
            <Switch
              id="vp-ce-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
