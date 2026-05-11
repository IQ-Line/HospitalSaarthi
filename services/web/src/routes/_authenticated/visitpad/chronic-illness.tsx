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
import {
  useVisitpadChronicIllnesses,
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPost,
} from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VISITPAD_CHRONIC_ILLNESS_CATEGORIES } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadChronicIllness } from '@/features/visitpad/types';
import {
  visitpadChronicIllnessEditFormSchema,
  type VisitpadChronicIllnessEditFormSchema,
} from '@/features/visitpad/validation';

const CI_BASE = '/api/v1/master-data/visitpad/chronic-illnesses';

export const Route = createFileRoute('/_authenticated/visitpad/chronic-illness')({
  component: VisitpadChronicIllnessPage,
});

function VisitpadChronicIllnessPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadChronicIllness | null>(null);
  const [deleting, setDeleting] = useState<VisitpadChronicIllness | null>(null);
  const cat = category === 'all' ? undefined : category;
  const { data, isLoading, error } = useVisitpadChronicIllnesses(search || undefined, cat);
  const patch = useVisitpadPatch(CI_BASE);
  const del = useVisitpadDelete(CI_BASE);
  const create = useVisitpadPost(CI_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () => rows.filter((r) => rowMatchesSearch(search, r.icd10_code, r.display_name, r.category)),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadChronicIllness, unknown>[]>(
    () => [
      { accessorKey: 'icd10_code', header: 'ICD-10', meta: { label: 'ICD-10' } },
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
      visitpadActionsColumn<VisitpadChronicIllness>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
      }),
    ],
    [patch, busy],
  );

  return (
    <VisitpadPageShell
      primary="chronic-illness"
      tabCount={tabCount}
      title="Chronic illness"
      description="Chronic condition reference list."
      actions={
        <VisitpadHeaderActions
          addLabel="Add chronic illness"
          onAddClick={() => setCreateOpen(true)}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search ICD code, name, category…"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VISITPAD_CHRONIC_ILLNESS_CATEGORIES.map((c) => (
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
            emptyTitle="No chronic illnesses found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

      <ChronicIllnessCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Chronic illness created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ChronicIllnessEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Chronic illness updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete chronic illness"
        description={`Soft-delete ${deleting?.icd10_code ?? ''} — ${deleting?.display_name ?? ''}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Chronic illness deleted');
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

function ChronicIllnessCreateDialog({
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
  const [category, setCategory] = useState('metabolic');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) {
      setCategory('metabolic');
      setIsActive(true);
    }
  }, [open]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add chronic illness"
      description="Create a chronic illness catalog row."
      submitLabel="Create"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const display_name = String(fd.get('display_name') ?? '').trim();
        const icd10_code = String(fd.get('icd10_code') ?? '').trim();
        const snomedRaw = String(fd.get('snomed_code') ?? '').trim();
        if (!display_name || !icd10_code) {
          toast.error('Display name and ICD-10 code are required.');
          return;
        }
        await onSubmit({
          display_name,
          icd10_code,
          category,
          snomed_code: snomedRaw.length ? snomedRaw : null,
          display_order: Number(fd.get('display_order') ?? 0) || 0,
          is_active: isActive,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ci-name">Display name</Label>
          <Input id="vp-ci-name" name="display_name" required maxLength={512} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-ci-icd">ICD-10 code</Label>
          <Input id="vp-ci-icd" name="icd10_code" required maxLength={16} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_CHRONIC_ILLNESS_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ci-snomed">SNOMED code (optional)</Label>
          <Input id="vp-ci-snomed" name="snomed_code" maxLength={64} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ci-order">Display order</Label>
          <Input id="vp-ci-order" name="display_order" type="number" defaultValue={0} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <Label htmlFor="vp-ci-act">Enabled</Label>
          <Switch id="vp-ci-act" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function ChronicIllnessEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadChronicIllness | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadChronicIllnessEditFormSchema>({
    resolver: zodResolver(visitpadChronicIllnessEditFormSchema),
    defaultValues: {
      icd10_code: '',
      display_name: '',
      category: 'metabolic',
      snomed_code: null,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        icd10_code: row.icd10_code,
        display_name: row.display_name,
        category: row.category as VisitpadChronicIllnessEditFormSchema['category'],
        snomed_code: row.snomed_code ?? null,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadChronicIllnessEditFormSchema> = async (v) => {
    const snomed = v.snomed_code?.trim();
    await onSave({
      icd10_code: v.icd10_code,
      display_name: v.display_name,
      category: v.category,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit chronic illness — ${row.icd10_code}` : 'Edit chronic illness'}
      description="Update ICD linkage, category, SNOMED, and display order."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-cie-name">Display name</Label>
            <Input id="vp-cie-name" maxLength={512} {...form.register('display_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-cie-icd">ICD-10 code</Label>
            <Input id="vp-cie-icd" maxLength={16} {...form.register('icd10_code')} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.watch('category')}
              onValueChange={(x) =>
                form.setValue('category', x as VisitpadChronicIllnessEditFormSchema['category'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_CHRONIC_ILLNESS_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-cie-snomed">SNOMED code</Label>
            <Input id="vp-cie-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-cie-order">Display order</Label>
            <Input id="vp-cie-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-cie-act">Enabled</Label>
            <Switch
              id="vp-cie-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
