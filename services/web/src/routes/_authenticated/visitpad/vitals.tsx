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
import { useVisitpadDelete, useVisitpadPatch, useVisitpadPost, useVisitpadVitals } from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import {
  VISITPAD_VITAL_CATEGORIES,
  VISITPAD_VITAL_DATA_TYPES,
  VISITPAD_VITAL_INPUT_METHODS,
  VISITPAD_VITAL_REFERENCE_KINDS,
} from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadVital } from '@/features/visitpad/types';
import {
  visitpadVitalCreateSchema,
  visitpadVitalEditFormSchema,
  type VisitpadVitalEditFormSchema,
} from '@/features/visitpad/validation';

const VITALS_BASE = '/api/v1/master-data/visitpad/vitals';

function summarizeJson(o: Record<string, unknown> | undefined | null): string {
  if (!o || Object.keys(o).length === 0) return '—';
  const s = JSON.stringify(o);
  return s.length > 56 ? `${s.slice(0, 56)}…` : s;
}

function criticalCell(low: number | null | undefined, high: number | null | undefined) {
  if (low == null && high == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-mono text-xs">
      {low ?? '—'} / {high ?? '—'}
    </span>
  );
}

export const Route = createFileRoute('/_authenticated/visitpad/vitals')({
  component: VisitpadVitalsPage,
});

function VisitpadVitalsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadVital | null>(null);
  const [deleting, setDeleting] = useState<VisitpadVital | null>(null);
  const cat = category === 'all' ? undefined : category;
  const { data, isLoading, error } = useVisitpadVitals(search || undefined, cat);
  const patch = useVisitpadPatch(VITALS_BASE);
  const del = useVisitpadDelete(VITALS_BASE);
  const create = useVisitpadPost(VITALS_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () => rows.filter((r) => rowMatchesSearch(search, r.code, r.name, r.short_name, r.category)),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadVital, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'name', header: 'Name', meta: { label: 'Name' } },
      {
        accessorKey: 'short_name',
        header: 'Short',
        meta: { label: 'Short' },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        meta: { label: 'Category' },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'data_type',
        header: 'Type',
        meta: { label: 'Type' },
      },
      { accessorKey: 'unit', header: 'Unit', meta: { label: 'Unit' } },
      {
        accessorKey: 'loinc_code',
        header: 'LOINC',
        meta: { label: 'LOINC' },
        cell: ({ getValue }) => {
          const v = getValue<string | null | undefined>();
          return v ? <span className="font-mono text-xs">{v}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'snomed_observable_code',
        header: 'SNOMED',
        meta: { label: 'SNOMED' },
        cell: ({ getValue }) => {
          const v = getValue<string | null | undefined>();
          return v ? <span className="font-mono text-xs">{v}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: 'normal_adult',
        header: 'Normal (adult)',
        meta: { label: 'Normal (adult)' },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {summarizeJson(row.original.normal_range_adult as Record<string, unknown> | undefined)}
          </span>
        ),
      },
      {
        id: 'critical',
        header: 'Critical',
        meta: { label: 'Critical' },
        cell: ({ row }) => criticalCell(row.original.critical_low, row.original.critical_high),
      },
      {
        id: 'paired',
        header: 'Paired',
        meta: { label: 'Paired' },
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.is_paired ? 'Yes' : '—'}
            {row.original.pair_code ? (
              <span className="text-muted-foreground"> ({row.original.pair_code})</span>
            ) : null}
          </span>
        ),
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
                toast.success(next ? 'Vital activated' : 'Vital deactivated');
              } catch (e) {
                toast.error(mutationErrorMessage(e));
              }
            }}
          />
        ),
      },
      visitpadActionsColumn<VisitpadVital>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
      }),
    ],
    [patch, busy],
  );

  return (
    <VisitpadPageShell
      primary="vitals"
      tabCount={tabCount}
      title="Vitals"
      description="Clinical vital definitions and display metadata."
      actions={
        <VisitpadHeaderActions addLabel="Add vital" onAddClick={() => setCreateOpen(true)} />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search code, name, unit…"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[200px]" aria-label="Category filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VISITPAD_VITAL_CATEGORIES.map((c) => (
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
            emptyTitle="No vitals found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

      <VitalCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Vital created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <VitalEditDialog
        vital={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Vital updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete vital"
        description={`Soft-delete vital “${deleting?.code ?? ''}”?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Vital deleted');
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

function VitalCreateDialog({
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
  const [category, setCategory] = useState('vital_signs');
  const [dataType, setDataType] = useState('numeric');
  const [refKind, setRefKind] = useState('none');
  const [inputMethod, setInputMethod] = useState('manual');
  const [isPaired, setIsPaired] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) {
      setCategory('vital_signs');
      setDataType('numeric');
      setRefKind('none');
      setInputMethod('manual');
      setIsPaired(false);
      setIsActive(true);
    }
  }, [open]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add vital"
      description="Create a vital catalog entry. Range and LOINC fields can be edited after create."
      submitLabel="Create vital"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const parsed = visitpadVitalCreateSchema.safeParse({
          code: String(fd.get('code') ?? '').trim(),
          name: String(fd.get('name') ?? '').trim(),
          short_name: String(fd.get('short_name') ?? '').trim(),
          category,
          data_type: dataType,
          unit: String(fd.get('unit') ?? '').trim(),
          default_unit_code: String(fd.get('default_unit_code') ?? '').trim(),
          allowed_units: [] as string[],
          critical_low: null,
          critical_high: null,
          reference_kind: refKind,
          reference_json: {},
          normal_range_adult: {},
          normal_range_paediatric: {},
          input_method: inputMethod,
          is_paired: isPaired,
          pair_code: null,
          display_order: Number(fd.get('display_order') ?? 0) || 0,
          is_active: isActive,
          loinc_code: null,
          snomed_observable_code: null,
        });
        if (!parsed.success) {
          toast.error(parsed.error.issues.map((er) => er.message).join(' '));
          return;
        }
        await onSubmit(parsed.data as Record<string, unknown>);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vp-v-code">Code</Label>
          <Input id="vp-v-code" name="code" required maxLength={64} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-short">Short name</Label>
          <Input id="vp-v-short" name="short_name" required maxLength={64} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-v-name">Name</Label>
          <Input id="vp-v-name" name="name" required maxLength={256} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_VITAL_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Data type</Label>
          <Select value={dataType} onValueChange={setDataType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_VITAL_DATA_TYPES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-unit">Unit label</Label>
          <Input id="vp-v-unit" name="unit" required maxLength={128} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-v-def">Default unit code</Label>
          <Input id="vp-v-def" name="default_unit_code" required maxLength={64} />
        </div>
        <div className="space-y-2">
          <Label>Reference kind</Label>
          <Select value={refKind} onValueChange={setRefKind}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_VITAL_REFERENCE_KINDS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Input method</Label>
          <Select value={inputMethod} onValueChange={setInputMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_VITAL_INPUT_METHODS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-v-order">Display order</Label>
          <Input id="vp-v-order" name="display_order" type="number" defaultValue={0} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2">
          <Label htmlFor="vp-v-paired">Paired vital</Label>
          <Switch id="vp-v-paired" checked={isPaired} onCheckedChange={setIsPaired} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2">
          <Label htmlFor="vp-v-act">Active</Label>
          <Switch id="vp-v-act" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function VitalEditDialog({
  vital,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  vital: VisitpadVital | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadVitalEditFormSchema>({
    resolver: zodResolver(visitpadVitalEditFormSchema),
    defaultValues: {
      name: '',
      short_name: '',
      category: 'vital_signs',
      data_type: 'numeric',
      unit: '',
      default_unit_code: '',
      reference_kind: 'none',
      input_method: 'manual',
      is_paired: false,
      pair_code: null,
      critical_low: null,
      critical_high: null,
      display_order: 0,
      is_active: true,
      loinc_code: null,
      snomed_observable_code: null,
    },
  });

  useEffect(() => {
    if (open && vital) {
      form.reset({
        name: vital.name,
        short_name: vital.short_name,
        category: vital.category as VisitpadVitalEditFormSchema['category'],
        data_type: vital.data_type as VisitpadVitalEditFormSchema['data_type'],
        unit: vital.unit,
        default_unit_code: vital.default_unit_code,
        reference_kind: (vital.reference_kind ?? 'none') as VisitpadVitalEditFormSchema['reference_kind'],
        input_method: (vital.input_method ?? 'manual') as VisitpadVitalEditFormSchema['input_method'],
        is_paired: !!vital.is_paired,
        pair_code: vital.pair_code ?? null,
        critical_low: vital.critical_low ?? null,
        critical_high: vital.critical_high ?? null,
        display_order: vital.display_order,
        is_active: vital.is_active,
        loinc_code: vital.loinc_code ?? null,
        snomed_observable_code: vital.snomed_observable_code ?? null,
      });
    }
  }, [open, vital, form]);

  const submit: SubmitHandler<VisitpadVitalEditFormSchema> = async (v) => {
    const loinc = v.loinc_code?.trim();
    const snomed = v.snomed_observable_code?.trim();
    const pair = v.pair_code?.trim();
    await onSave({
      name: v.name,
      short_name: v.short_name,
      category: v.category,
      data_type: v.data_type,
      unit: v.unit,
      default_unit_code: v.default_unit_code,
      reference_kind: v.reference_kind,
      input_method: v.input_method,
      is_paired: v.is_paired,
      pair_code: pair && pair.length > 0 ? pair : null,
      critical_low: v.critical_low,
      critical_high: v.critical_high,
      display_order: v.display_order,
      is_active: v.is_active,
      loinc_code: loinc && loinc.length > 0 ? loinc : null,
      snomed_observable_code: snomed && snomed.length > 0 ? snomed : null,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={vital ? `Edit vital — ${vital.code}` : 'Edit vital'}
      description="Vital code is immutable. Adjust labels, units, references, and coding fields."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {vital ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Code (read-only)</Label>
            <Input value={vital.code} readOnly className="bg-muted font-mono text-sm" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ve-name">Name</Label>
            <Input id="vp-ve-name" maxLength={256} {...form.register('name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ve-short">Short name</Label>
            <Input id="vp-ve-short" maxLength={64} {...form.register('short_name')} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.watch('category')}
              onValueChange={(x) => form.setValue('category', x as VisitpadVitalEditFormSchema['category'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_VITAL_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data type</Label>
            <Select
              value={form.watch('data_type')}
              onValueChange={(x) => form.setValue('data_type', x as VisitpadVitalEditFormSchema['data_type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_VITAL_DATA_TYPES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ve-unit">Unit label</Label>
            <Input id="vp-ve-unit" maxLength={128} {...form.register('unit')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ve-def">Default unit code</Label>
            <Input id="vp-ve-def" maxLength={64} {...form.register('default_unit_code')} />
          </div>
          <div className="space-y-2">
            <Label>Reference kind</Label>
            <Select
              value={form.watch('reference_kind')}
              onValueChange={(x) =>
                form.setValue('reference_kind', x as VisitpadVitalEditFormSchema['reference_kind'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_VITAL_REFERENCE_KINDS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Input method</Label>
            <Select
              value={form.watch('input_method')}
              onValueChange={(x) =>
                form.setValue('input_method', x as VisitpadVitalEditFormSchema['input_method'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_VITAL_INPUT_METHODS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ve-loinc">LOINC</Label>
            <Input id="vp-ve-loinc" maxLength={32} {...form.register('loinc_code')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ve-snomed">SNOMED observable</Label>
            <Input id="vp-ve-snomed" maxLength={64} {...form.register('snomed_observable_code')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ve-cl">Critical low</Label>
            <Input
              id="vp-ve-cl"
              type="number"
              step="any"
              {...form.register('critical_low', {
                setValueAs: (v) => {
                  if (v === '' || v === null || v === undefined) return null;
                  const n = typeof v === 'number' ? v : +`${v}`;
                  return n !== n ? null : n;
                },
              })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ve-ch">Critical high</Label>
            <Input
              id="vp-ve-ch"
              type="number"
              step="any"
              {...form.register('critical_high', {
                setValueAs: (v) => {
                  if (v === '' || v === null || v === undefined) return null;
                  const n = typeof v === 'number' ? v : +`${v}`;
                  return n !== n ? null : n;
                },
              })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ve-pair">Pair code</Label>
            <Input id="vp-ve-pair" maxLength={64} {...form.register('pair_code')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ve-order">Display order</Label>
            <Input id="vp-ve-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-ve-paired">Paired vital</Label>
            <Switch
              id="vp-ve-paired"
              checked={!!form.watch('is_paired')}
              onCheckedChange={(c) => form.setValue('is_paired', c)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-ve-act">Active</Label>
            <Switch
              id="vp-ve-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
