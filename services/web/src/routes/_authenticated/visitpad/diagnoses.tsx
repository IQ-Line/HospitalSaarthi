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
import { useVisitpadDelete, useVisitpadDiagnoses, useVisitpadPatch, useVisitpadPost } from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VISITPAD_DIAGNOSIS_CATEGORIES, VISITPAD_ICD_VERSIONS } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadDiagnosis } from '@/features/visitpad/types';
import {
  visitpadDiagnosisEditFormSchema,
  type VisitpadDiagnosisEditFormSchema,
} from '@/features/visitpad/validation';

const DX_BASE = '/api/v1/master-data/visitpad/diagnoses';

export const Route = createFileRoute('/_authenticated/visitpad/diagnoses')({
  component: VisitpadDiagnosesPage,
});

function VisitpadDiagnosesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadDiagnosis | null>(null);
  const [deleting, setDeleting] = useState<VisitpadDiagnosis | null>(null);
  const cat = category === 'all' ? undefined : category;
  const { data, isLoading, error } = useVisitpadDiagnoses(search || undefined, cat);
  const patch = useVisitpadPatch(DX_BASE);
  const del = useVisitpadDelete(DX_BASE);
  const create = useVisitpadPost(DX_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () => rows.filter((r) => rowMatchesSearch(search, r.icd10_code, r.display_name, r.category)),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadDiagnosis, unknown>[]>(
    () => [
      { accessorKey: 'icd10_code', header: 'ICD-10', meta: { label: 'ICD-10' } },
      {
        accessorKey: 'official_descriptor',
        header: 'Descriptor',
        meta: { label: 'Descriptor' },
        cell: ({ row }) => (
          <span className="max-w-[220px] truncate text-sm" title={row.original.official_descriptor}>
            {row.original.official_descriptor ?? '—'}
          </span>
        ),
      },
      { accessorKey: 'display_name', header: 'Display', meta: { label: 'Display' } },
      {
        accessorKey: 'category',
        header: 'Category',
        meta: { label: 'Category' },
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
      visitpadActionsColumn<VisitpadDiagnosis>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
      }),
    ],
    [patch, busy],
  );

  return (
    <VisitpadPageShell
      primary="diagnoses"
      tabCount={tabCount}
      title="Diagnosis"
      description="ICD-backed diagnosis reference rows."
      actions={
        <VisitpadHeaderActions addLabel="Add diagnosis" onAddClick={() => setCreateOpen(true)} />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search ICD, descriptor, alias…"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VISITPAD_DIAGNOSIS_CATEGORIES.map((c) => (
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
            emptyTitle="No diagnoses found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

      <DiagnosisCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Diagnosis created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <DiagnosisEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Diagnosis updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete diagnosis"
        description={`Soft-delete ${deleting?.icd10_code ?? ''} — ${deleting?.display_name ?? ''}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Diagnosis deleted');
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

function DiagnosisCreateDialog({
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
  const [icdVersion, setIcdVersion] = useState('ICD-10');
  const [category, setCategory] = useState('general');
  const [chronic, setChronic] = useState(false);
  const [notifiable, setNotifiable] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) {
      setIcdVersion('ICD-10');
      setCategory('general');
      setChronic(false);
      setNotifiable(false);
      setIsActive(true);
    }
  }, [open]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add diagnosis"
      description="Create an ICD diagnosis row. Official descriptor should match the registry wording."
      submitLabel="Create diagnosis"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const icd10_code = String(fd.get('icd10_code') ?? '').trim();
        const official_descriptor = String(fd.get('official_descriptor') ?? '').trim();
        const display_name = String(fd.get('display_name') ?? '').trim();
        const snomedRaw = String(fd.get('snomed_code') ?? '').trim();
        if (!icd10_code || !official_descriptor || !display_name) {
          toast.error('ICD code, official descriptor, and display name are required.');
          return;
        }
        await onSubmit({
          icd10_code,
          icd_version: icdVersion,
          official_descriptor,
          display_name,
          category,
          is_chronic_flag: chronic,
          is_notifiable: notifiable,
          display_order: Number(fd.get('display_order') ?? 0) || 0,
          is_active: isActive,
          snomed_code: snomedRaw.length ? snomedRaw : null,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vp-dx-icd">ICD-10 code</Label>
          <Input id="vp-dx-icd" name="icd10_code" required maxLength={16} />
        </div>
        <div className="space-y-2">
          <Label>ICD version</Label>
          <Select value={icdVersion} onValueChange={setIcdVersion}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_ICD_VERSIONS.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-dx-off">Official descriptor</Label>
          <Input id="vp-dx-off" name="official_descriptor" required maxLength={512} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-dx-disp">Display name / alias</Label>
          <Input id="vp-dx-disp" name="display_name" required maxLength={512} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_DIAGNOSIS_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-dx-snomed">SNOMED code (optional)</Label>
          <Input id="vp-dx-snomed" name="snomed_code" maxLength={64} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-dx-order">Display order</Label>
          <Input id="vp-dx-order" name="display_order" type="number" defaultValue={0} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="vp-dx-chr">Chronic flag</Label>
          <Switch id="vp-dx-chr" checked={chronic} onCheckedChange={setChronic} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="vp-dx-not">Notifiable</Label>
          <Switch id="vp-dx-not" checked={notifiable} onCheckedChange={setNotifiable} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <Label htmlFor="vp-dx-act">Enabled</Label>
          <Switch id="vp-dx-act" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function DiagnosisEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadDiagnosis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadDiagnosisEditFormSchema>({
    resolver: zodResolver(visitpadDiagnosisEditFormSchema),
    defaultValues: {
      icd10_code: '',
      icd_version: 'ICD-10',
      official_descriptor: '',
      display_name: '',
      category: 'general',
      is_chronic_flag: false,
      is_notifiable: false,
      snomed_code: null,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        icd10_code: row.icd10_code,
        icd_version: (row.icd_version ?? 'ICD-10') as VisitpadDiagnosisEditFormSchema['icd_version'],
        official_descriptor: row.official_descriptor ?? '',
        display_name: row.display_name,
        category: row.category as VisitpadDiagnosisEditFormSchema['category'],
        is_chronic_flag: !!row.is_chronic_flag,
        is_notifiable: !!row.is_notifiable,
        snomed_code: row.snomed_code ?? null,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadDiagnosisEditFormSchema> = async (v) => {
    const snomed = v.snomed_code?.trim();
    await onSave({
      icd10_code: v.icd10_code,
      icd_version: v.icd_version,
      official_descriptor: v.official_descriptor,
      display_name: v.display_name,
      category: v.category,
      is_chronic_flag: v.is_chronic_flag,
      is_notifiable: v.is_notifiable,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit diagnosis — ${row.icd10_code}` : 'Edit diagnosis'}
      description="Update ICD fields, category, flags, and SNOMED where applicable."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vp-de-icd">ICD-10 code</Label>
            <Input id="vp-de-icd" maxLength={16} {...form.register('icd10_code')} />
          </div>
          <div className="space-y-2">
            <Label>ICD version</Label>
            <Select
              value={form.watch('icd_version')}
              onValueChange={(x) => form.setValue('icd_version', x as VisitpadDiagnosisEditFormSchema['icd_version'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_ICD_VERSIONS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-de-off">Official descriptor</Label>
            <Input id="vp-de-off" maxLength={512} {...form.register('official_descriptor')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-de-disp">Display name / alias</Label>
            <Input id="vp-de-disp" maxLength={512} {...form.register('display_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Category</Label>
            <Select
              value={form.watch('category')}
              onValueChange={(x) => form.setValue('category', x as VisitpadDiagnosisEditFormSchema['category'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_DIAGNOSIS_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-de-snomed">SNOMED code</Label>
            <Input id="vp-de-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-de-order">Display order</Label>
            <Input id="vp-de-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="vp-de-chr">Chronic flag</Label>
            <Switch
              id="vp-de-chr"
              checked={!!form.watch('is_chronic_flag')}
              onCheckedChange={(c) => form.setValue('is_chronic_flag', c)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="vp-de-not">Notifiable</Label>
            <Switch
              id="vp-de-not"
              checked={!!form.watch('is_notifiable')}
              onCheckedChange={(c) => form.setValue('is_notifiable', c)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-de-act">Enabled</Label>
            <Switch
              id="vp-de-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
