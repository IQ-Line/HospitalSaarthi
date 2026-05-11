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
import { useVisitpadAllergens, useVisitpadDelete, useVisitpadPatch, useVisitpadPost } from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VisitpadAllergiesSecondaryNav } from '@/features/visitpad/components/visitpad-secondary-link-row';
import { VISITPAD_ALLERGEN_TYPES, VISITPAD_REACTION_SEVERITY_DEFAULTS } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadAllergen } from '@/features/visitpad/types';
import {
  visitpadAllergenEditFormSchema,
  type VisitpadAllergenEditFormSchema,
} from '@/features/visitpad/validation';

const AG_BASE = '/api/v1/master-data/visitpad/allergens';

export const Route = createFileRoute('/_authenticated/visitpad/allergens')({
  component: VisitpadAllergensPage,
});

function VisitpadAllergensPage() {
  const [search, setSearch] = useState('');
  const [allergenType, setAllergenType] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitpadAllergen | null>(null);
  const [deleting, setDeleting] = useState<VisitpadAllergen | null>(null);
  const at = allergenType === 'all' ? undefined : allergenType;
  const { data, isLoading, error } = useVisitpadAllergens(search || undefined, at);
  const patch = useVisitpadPatch(AG_BASE);
  const del = useVisitpadDelete(AG_BASE);
  const create = useVisitpadPost(AG_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending;

  const filtered = useMemo(
    () => rows.filter((r) => rowMatchesSearch(search, r.code, r.display_name, r.allergen_type)),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadAllergen, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Name', meta: { label: 'Name' } },
      {
        accessorKey: 'allergen_type',
        header: 'Type',
        meta: { label: 'Type' },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'drug_class',
        header: 'Drug class',
        meta: { label: 'Drug class' },
        cell: ({ row }) => row.original.drug_class ?? <span className="text-muted-foreground">—</span>,
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
      visitpadActionsColumn<VisitpadAllergen>({
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
      breadcrumbLabel="Allergens"
      title="Allergens"
      description="Allergen catalog (drug, food, environmental, …)."
      secondaryNav={<VisitpadAllergiesSecondaryNav />}
      actions={
        <VisitpadHeaderActions addLabel="Add allergen" onAddClick={() => setCreateOpen(true)} />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search allergen or drug class…"
            />
            <Select value={allergenType} onValueChange={setAllergenType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {VISITPAD_ALLERGEN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
            emptyTitle="No allergens found"
            emptyDescription="Adjust your search or add catalog entries."
          />
        )}
      </div>

      <AllergenCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Allergen created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <AllergenEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Allergen updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete allergen"
        description={`Soft-delete “${deleting?.display_name ?? deleting?.code ?? ''}”?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Allergen deleted');
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

function AllergenCreateDialog({
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
  const [atype, setAtype] = useState('drug');
  const [severity, setSeverity] = useState('unknown');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) {
      setAtype('drug');
      setSeverity('unknown');
      setIsActive(true);
    }
  }, [open]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add allergen"
      description="Create an allergen catalog entry."
      submitLabel="Create allergen"
      isSubmitting={isSubmitting}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const code = String(fd.get('code') ?? '').trim();
        const display_name = String(fd.get('display_name') ?? '').trim();
        const drug_class_raw = String(fd.get('drug_class') ?? '').trim();
        const snomedRaw = String(fd.get('snomed_code') ?? '').trim();
        if (!code || !display_name) {
          toast.error('Code and display name are required.');
          return;
        }
        await onSubmit({
          code,
          display_name,
          allergen_type: atype,
          drug_class: drug_class_raw.length ? drug_class_raw : null,
          reaction_severity_default: severity,
          display_order: Number(fd.get('display_order') ?? 0) || 0,
          is_active: isActive,
          snomed_code: snomedRaw.length ? snomedRaw : null,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vp-ag-code">Code</Label>
          <Input id="vp-ag-code" name="code" required maxLength={64} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ag-name">Display name</Label>
          <Input id="vp-ag-name" name="display_name" required maxLength={256} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={atype} onValueChange={setAtype}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_ALLERGEN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_REACTION_SEVERITY_DEFAULTS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ag-drug">Drug class (optional)</Label>
          <Input id="vp-ag-drug" name="drug_class" maxLength={256} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ag-snomed">SNOMED code (optional)</Label>
          <Input id="vp-ag-snomed" name="snomed_code" maxLength={64} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ag-order">Display order</Label>
          <Input id="vp-ag-order" name="display_order" type="number" defaultValue={0} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <Label htmlFor="vp-ag-act">Enabled</Label>
          <Switch id="vp-ag-act" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function AllergenEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadAllergen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadAllergenEditFormSchema>({
    resolver: zodResolver(visitpadAllergenEditFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      allergen_type: 'drug',
      drug_class: null,
      reaction_severity_default: 'unknown',
      snomed_code: null,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        code: row.code,
        display_name: row.display_name,
        allergen_type: row.allergen_type as VisitpadAllergenEditFormSchema['allergen_type'],
        drug_class: row.drug_class ?? null,
        reaction_severity_default: (row.reaction_severity_default ??
          'unknown') as VisitpadAllergenEditFormSchema['reaction_severity_default'],
        snomed_code: row.snomed_code ?? null,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadAllergenEditFormSchema> = async (v) => {
    const dc = v.drug_class?.trim();
    const snomed = v.snomed_code?.trim();
    await onSave({
      code: v.code,
      display_name: v.display_name,
      allergen_type: v.allergen_type,
      drug_class: dc && dc.length > 0 ? dc : null,
      reaction_severity_default: v.reaction_severity_default,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit allergen — ${row.code}` : 'Edit allergen'}
      description="Update allergen metadata, default severity, and coding fields."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vp-ae-code">Code</Label>
            <Input id="vp-ae-code" maxLength={64} {...form.register('code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ae-name">Display name</Label>
            <Input id="vp-ae-name" maxLength={256} {...form.register('display_name')} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.watch('allergen_type')}
              onValueChange={(x) => form.setValue('allergen_type', x as VisitpadAllergenEditFormSchema['allergen_type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_ALLERGEN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default severity</Label>
            <Select
              value={form.watch('reaction_severity_default')}
              onValueChange={(x) =>
                form.setValue(
                  'reaction_severity_default',
                  x as VisitpadAllergenEditFormSchema['reaction_severity_default'],
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_REACTION_SEVERITY_DEFAULTS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ae-drug">Drug class</Label>
            <Input id="vp-ae-drug" maxLength={256} {...form.register('drug_class')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ae-snomed">SNOMED code</Label>
            <Input id="vp-ae-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ae-order">Display order</Label>
            <Input id="vp-ae-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-ae-act">Enabled</Label>
            <Switch
              id="vp-ae-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
