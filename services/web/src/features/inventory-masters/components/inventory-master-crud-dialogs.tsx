import type { ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { CatalogActiveSwitch } from '@/features/visitpad/components/catalog-active-switch';
import { useStores } from '@/features/store-configuration/api/stores';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { Switch } from '@pulse/ui/switch';
import { Textarea } from '@pulse/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import {
  useInventoryMasterDelete,
  useInventoryMasterPatch,
  useInventoryMasterPost,
} from '@/features/inventory-masters/api/mutations';
import { INVENTORY_MASTERS_API_BASE } from '@/features/inventory-masters/api/query-keys';
import { inventoryMasterApiBasePath } from '@/features/inventory-masters/lib/inventory-master-api-paths';
import {
  DEFAULT_STORE_TYPE_OPERATIONAL_CONFIG,
  type InventoryCategory,
  type InventoryHsnGst,
  type InventoryItemType,
  type InventoryManufacturer,
  type InventoryMasterTabId,
  type InventoryStorageCondition,
  type InventoryStoreType,
  type InventoryUom,
} from '@/features/inventory-masters/types';

const nameOnlySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  is_active: z.boolean(),
});

const uomSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  abbreviation: z
    .string()
    .trim()
    .min(1, 'Abbreviation is required')
    .regex(/^[a-zA-Z0-9µ/]+$/, 'Use letters, numbers, µ, or / only'),
  is_active: z.boolean(),
});

const storageSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().min(1, 'Description is required'),
  is_active: z.boolean(),
});

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
  parent_category_id: z.string().nullable(),
  is_active: z.boolean(),
});

const hsnSchema = z
  .object({
    hsn_code: z.string().trim().regex(/^\d{4,8}$/, 'HSN code must be 4–8 digits'),
    effective_from: z.string().trim().min(1, 'Effective date is required'),
    cgst_pct: z.coerce.number().min(0),
    sgst_pct: z.coerce.number().min(0),
    igst_pct: z.coerce.number().min(0),
    remarks: z.string().optional(),
    is_active: z.boolean(),
  })
  .refine((v) => v.cgst_pct + v.sgst_pct === v.igst_pct, {
    message: 'CGST + SGST must equal IGST',
    path: ['igst_pct'],
  });

const STORE_TYPE_DESCRIPTION_MAX_LENGTH = 500;
const NONE_STORE_VALUE = '__none__';

const storeTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a store type name.')
    .max(200, 'Store type name must be at most 200 characters.'),
  description: z
    .string()
    .max(
      STORE_TYPE_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${STORE_TYPE_DESCRIPTION_MAX_LENGTH} characters.`,
    )
    .optional(),
  can_receive_stock: z.boolean(),
  can_dispense: z.boolean(),
  can_issue_to_ward: z.boolean(),
  track_batch_expiry: z.boolean(),
  indent_authority: z.boolean(),
  default_indent_target_store_id: z.string().nullable(),
  is_active: z.boolean(),
});

const manufacturerSchema = z.object({
  code: z.string().trim().min(1, 'Code is required'),
  display_name: z.string().trim().min(1, 'Display name is required'),
  is_active: z.boolean(),
});

type DeleteTarget = { id: string; label: string };

type InventoryMasterCrudDialogsProps = {
  tabId: InventoryMasterTabId;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing:
    | InventoryItemType
    | InventoryCategory
    | InventoryUom
    | InventoryStorageCondition
    | InventoryHsnGst
    | InventoryStoreType
    | InventoryManufacturer
    | null;
  onEditingChange: (
    row:
      | InventoryItemType
      | InventoryCategory
      | InventoryUom
      | InventoryStorageCondition
      | InventoryHsnGst
      | InventoryStoreType
      | InventoryManufacturer
      | null,
  ) => void;
  deleting: DeleteTarget | null;
  onDeletingChange: (target: DeleteTarget | null) => void;
  categories?: InventoryCategory[];
};

function ActiveField({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <CatalogActiveSwitch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  );
}

export function InventoryMasterCrudDialogs({
  tabId,
  createOpen,
  onCreateOpenChange,
  editing,
  onEditingChange,
  deleting,
  onDeletingChange,
  categories = [],
}: InventoryMasterCrudDialogsProps) {
  const basePath = inventoryMasterApiBasePath(tabId);
  const apiBase = basePath ?? `${INVENTORY_MASTERS_API_BASE}/item-types`;
  const create = useInventoryMasterPost(apiBase);
  const patch = useInventoryMasterPatch(apiBase);
  const del = useInventoryMasterDelete(apiBase);
  const busy = create.isPending || patch.isPending || del.isPending;

  if (!basePath) {
    return null;
  }

  return (
    <>
      <ItemTypeDialogs
        tabId={tabId}
        basePath={basePath}
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        editing={editing}
        onEditingChange={onEditingChange}
        categories={categories}
        create={create}
        patch={patch}
        busy={busy}
      />
      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open) onDeletingChange(null);
        }}
        title="Delete record?"
        description={
          deleting ? `Delete “${deleting.label}”? This can be restored from the catalog.` : ''
        }
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await del.mutateAsync(deleting.id);
            toast.success('Deleted');
            onDeletingChange(null);
          } catch (error) {
            toast.error(mutationErrorMessage(error));
          }
        }}
      />
    </>
  );
}

function ItemTypeDialogs({
  tabId,
  createOpen,
  onCreateOpenChange,
  editing,
  onEditingChange,
  categories,
  create,
  patch,
  busy,
}: {
  tabId: InventoryMasterTabId;
  basePath: string;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: InventoryMasterCrudDialogsProps['editing'];
  onEditingChange: InventoryMasterCrudDialogsProps['onEditingChange'];
  categories: InventoryCategory[];
  create: ReturnType<typeof useInventoryMasterPost>;
  patch: ReturnType<typeof useInventoryMasterPatch>;
  busy: boolean;
}) {
  if (tabId === 'item-types') {
    return (
      <NameOnlyCrudDialog
        title="Item type"
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        editing={editing as InventoryItemType | null}
        onEditingChange={onEditingChange as (row: InventoryItemType | null) => void}
        getName={(row) => row.item_type}
        create={create}
        patch={patch}
        busy={busy}
        mapPatchBody={(values) => ({ name: values.name, is_active: values.is_active })}
        mapCreateBody={(values) => ({ name: values.name, is_active: values.is_active })}
      />
    );
  }

  if (tabId === 'categories') {
    return (
      <CategoryCrudDialog
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        editing={editing as InventoryCategory | null}
        onEditingChange={onEditingChange as (row: InventoryCategory | null) => void}
        categories={categories}
        create={create}
        patch={patch}
        busy={busy}
      />
    );
  }

  if (tabId === 'uom') {
    return (
      <UomCrudDialog
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        editing={editing as InventoryUom | null}
        onEditingChange={onEditingChange as (row: InventoryUom | null) => void}
        create={create}
        patch={patch}
        busy={busy}
      />
    );
  }

  if (tabId === 'storage-conditions') {
    return (
      <StorageCrudDialog
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        editing={editing as InventoryStorageCondition | null}
        onEditingChange={onEditingChange as (row: InventoryStorageCondition | null) => void}
        create={create}
        patch={patch}
        busy={busy}
      />
    );
  }

  if (tabId === 'hsn-gst') {
    return (
      <HsnCrudDialog
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        editing={editing as InventoryHsnGst | null}
        onEditingChange={onEditingChange as (row: InventoryHsnGst | null) => void}
        create={create}
        patch={patch}
        busy={busy}
      />
    );
  }

  if (tabId === 'store-types') {
    return (
      <StoreTypeCrudDialog
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        editing={editing as InventoryStoreType | null}
        onEditingChange={onEditingChange as (row: InventoryStoreType | null) => void}
        create={create}
        patch={patch}
        busy={busy}
      />
    );
  }

  if (tabId === 'manufacturers') {
    return (
      <ManufacturerCrudDialog
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        editing={editing as InventoryManufacturer | null}
        onEditingChange={onEditingChange as (row: InventoryManufacturer | null) => void}
        create={create}
        patch={patch}
        busy={busy}
      />
    );
  }

  return null;
}

type NameOnlyValues = z.infer<typeof nameOnlySchema>;

function NameOnlyCrudDialog<T extends { id: string; status: 'active' | 'inactive' }>({
  title,
  createOpen,
  onCreateOpenChange,
  editing,
  onEditingChange,
  getName,
  create,
  patch,
  busy,
  mapCreateBody,
  mapPatchBody,
}: {
  title: string;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: (T & { id: string }) | null;
  onEditingChange: (row: T | null) => void;
  getName: (row: T) => string;
  create: ReturnType<typeof useInventoryMasterPost>;
  patch: ReturnType<typeof useInventoryMasterPatch>;
  busy: boolean;
  mapCreateBody: (values: NameOnlyValues) => Record<string, unknown>;
  mapPatchBody: (values: NameOnlyValues) => Record<string, unknown>;
}) {
  const form = useForm<NameOnlyValues>({
    resolver: zodResolver(nameOnlySchema),
    defaultValues: { name: '', is_active: true },
  });

  useEffect(() => {
    if (createOpen) {
      form.reset({ name: '', is_active: true });
    }
  }, [createOpen, form]);

  useEffect(() => {
    if (editing) {
      form.reset({ name: getName(editing), is_active: editing.status === 'active' });
    }
  }, [editing, form, getName]);

  const submitCreate: SubmitHandler<NameOnlyValues> = async (values) => {
    try {
      await create.mutateAsync(mapCreateBody(values));
      toast.success(`${title} created`);
      onCreateOpenChange(false);
    } catch (error) {
      toast.error(mutationErrorMessage(error));
    }
  };

  const submitEdit: SubmitHandler<NameOnlyValues> = async (values) => {
    if (!editing) return;
    try {
      await patch.mutateAsync({ id: editing.id, body: mapPatchBody(values) });
      toast.success(`${title} updated`);
      onEditingChange(null);
    } catch (error) {
      toast.error(mutationErrorMessage(error));
    }
  };

  return (
    <>
      <EntityFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        title={`Add ${title}`}
        submitLabel="Create"
        loading={busy}
        onSubmit={form.handleSubmit(submitCreate)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="inv-name">Name</Label>
            <Input id="inv-name" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <ActiveField
            checked={form.watch('is_active')}
            onCheckedChange={(value) => form.setValue('is_active', value)}
          />
        </div>
      </EntityFormDialog>
      <EntityFormDialog
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) onEditingChange(null);
        }}
        title={`Edit ${title}`}
        submitLabel="Save"
        loading={busy}
        onSubmit={form.handleSubmit(submitEdit)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="inv-name-edit">Name</Label>
            <Input id="inv-name-edit" {...form.register('name')} />
          </div>
          <ActiveField
            checked={form.watch('is_active')}
            onCheckedChange={(value) => form.setValue('is_active', value)}
          />
        </div>
      </EntityFormDialog>
    </>
  );
}

function CategoryCrudDialog({
  createOpen,
  onCreateOpenChange,
  editing,
  onEditingChange,
  categories,
  create,
  patch,
  busy,
}: {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: InventoryCategory | null;
  onEditingChange: (row: InventoryCategory | null) => void;
  categories: InventoryCategory[];
  create: ReturnType<typeof useInventoryMasterPost>;
  patch: ReturnType<typeof useInventoryMasterPatch>;
  busy: boolean;
}) {
  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', parent_category_id: null, is_active: true },
  });

  useEffect(() => {
    if (createOpen) {
      form.reset({ name: '', description: '', parent_category_id: null, is_active: true });
    }
  }, [createOpen, form]);

  useEffect(() => {
    if (editing) {
      const parent = categories.find((c) => c.category_name === editing.parent_category);
      form.reset({
        name: editing.category_name,
        description: '',
        parent_category_id: parent?.id ?? null,
        is_active: editing.status === 'active',
      });
    }
  }, [categories, editing, form]);

  const toBody = (values: z.infer<typeof categorySchema>) => ({
    name: values.name,
    description: values.description?.trim() || null,
    parent_category_id: values.parent_category_id,
    is_active: values.is_active,
  });

  return (
    <CrudDialogPair
      entityLabel="Category"
      createOpen={createOpen}
      onCreateOpenChange={onCreateOpenChange}
      editing={editing}
      onEditingChange={onEditingChange}
      busy={busy}
      onCreate={(values) => create.mutateAsync(toBody(values))}
      onEdit={(id, values) => patch.mutateAsync({ id, body: toBody(values) })}
      form={form}
      renderFields={() => (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-name">Category name</Label>
            <Input id="cat-name" {...form.register('name')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-desc">Description</Label>
            <Input id="cat-desc" {...form.register('description')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Parent category</Label>
            <Select
              value={form.watch('parent_category_id') ?? 'none'}
              onValueChange={(value) =>
                form.setValue('parent_category_id', value === 'none' ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories
                  .filter((c) => c.id !== editing?.id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.category_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <ActiveField
            checked={form.watch('is_active')}
            onCheckedChange={(value) => form.setValue('is_active', value)}
          />
        </>
      )}
    />
  );
}

function UomCrudDialog(props: {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: InventoryUom | null;
  onEditingChange: (row: InventoryUom | null) => void;
  create: ReturnType<typeof useInventoryMasterPost>;
  patch: ReturnType<typeof useInventoryMasterPatch>;
  busy: boolean;
}) {
  const form = useForm<z.infer<typeof uomSchema>>({
    resolver: zodResolver(uomSchema),
    defaultValues: { name: '', abbreviation: '', is_active: true },
  });

  useEffect(() => {
    if (props.createOpen) form.reset({ name: '', abbreviation: '', is_active: true });
  }, [props.createOpen, form]);

  useEffect(() => {
    if (props.editing) {
      form.reset({
        name: props.editing.name,
        abbreviation: props.editing.abbreviation,
        is_active: props.editing.status === 'active',
      });
    }
  }, [props.editing, form]);

  const toBody = (values: z.infer<typeof uomSchema>) => ({
    name: values.name,
    abbreviation: values.abbreviation,
    is_active: values.is_active,
  });

  return (
    <CrudDialogPair
      entityLabel="Unit of measure"
      {...props}
      form={form}
      onCreate={(values) => props.create.mutateAsync(toBody(values))}
      onEdit={(id, values) => props.patch.mutateAsync({ id, body: toBody(values) })}
      renderFields={() => (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="uom-name">Name</Label>
            <Input id="uom-name" {...form.register('name')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="uom-abbr">Abbreviation</Label>
            <Input id="uom-abbr" {...form.register('abbreviation')} />
          </div>
          <ActiveField
            checked={form.watch('is_active')}
            onCheckedChange={(value) => form.setValue('is_active', value)}
          />
        </>
      )}
    />
  );
}

function StorageCrudDialog(props: {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: InventoryStorageCondition | null;
  onEditingChange: (row: InventoryStorageCondition | null) => void;
  create: ReturnType<typeof useInventoryMasterPost>;
  patch: ReturnType<typeof useInventoryMasterPatch>;
  busy: boolean;
}) {
  const form = useForm<z.infer<typeof storageSchema>>({
    resolver: zodResolver(storageSchema),
    defaultValues: { name: '', description: '', is_active: true },
  });

  useEffect(() => {
    if (props.createOpen) form.reset({ name: '', description: '', is_active: true });
  }, [props.createOpen, form]);

  useEffect(() => {
    if (props.editing) {
      form.reset({
        name: props.editing.storage_condition,
        description: props.editing.description ?? '',
        is_active: props.editing.status === 'active',
      });
    }
  }, [props.editing, form]);

  const toBody = (values: z.infer<typeof storageSchema>) => ({
    name: values.name,
    description: values.description,
    is_active: values.is_active,
  });

  return (
    <CrudDialogPair
      entityLabel="Storage condition"
      {...props}
      form={form}
      onCreate={(values) => props.create.mutateAsync(toBody(values))}
      onEdit={(id, values) => props.patch.mutateAsync({ id, body: toBody(values) })}
      renderFields={() => (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="storage-name">Name</Label>
            <Input id="storage-name" {...form.register('name')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="storage-desc">Description</Label>
            <Input id="storage-desc" {...form.register('description')} />
          </div>
          <ActiveField
            checked={form.watch('is_active')}
            onCheckedChange={(value) => form.setValue('is_active', value)}
          />
        </>
      )}
    />
  );
}

function HsnCrudDialog(props: {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: InventoryHsnGst | null;
  onEditingChange: (row: InventoryHsnGst | null) => void;
  create: ReturnType<typeof useInventoryMasterPost>;
  patch: ReturnType<typeof useInventoryMasterPatch>;
  busy: boolean;
}) {
  const form = useForm<z.infer<typeof hsnSchema>>({
    resolver: zodResolver(hsnSchema),
    defaultValues: {
      hsn_code: '',
      effective_from: '',
      cgst_pct: 0,
      sgst_pct: 0,
      igst_pct: 0,
      remarks: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (props.createOpen) {
      form.reset({
        hsn_code: '',
        effective_from: '',
        cgst_pct: 0,
        sgst_pct: 0,
        igst_pct: 0,
        remarks: '',
        is_active: true,
      });
    }
  }, [props.createOpen, form]);

  useEffect(() => {
    if (props.editing) {
      form.reset({
        hsn_code: props.editing.hsn_code,
        effective_from: props.editing.activation_date,
        cgst_pct: props.editing.cgst_percent,
        sgst_pct: props.editing.sgst_percent,
        igst_pct: props.editing.igst_percent,
        remarks: '',
        is_active: props.editing.status === 'active',
      });
    }
  }, [props.editing, form]);

  const toCreateBody = (values: z.infer<typeof hsnSchema>) => ({
    hsn_code: values.hsn_code,
    effective_from: values.effective_from,
    cgst_pct: values.cgst_pct,
    sgst_pct: values.sgst_pct,
    igst_pct: values.igst_pct,
    remarks: values.remarks?.trim() || null,
    is_active: values.is_active,
  });

  const toPatchBody = (values: z.infer<typeof hsnSchema>) => ({
    effective_from: values.effective_from,
    cgst_pct: values.cgst_pct,
    sgst_pct: values.sgst_pct,
    igst_pct: values.igst_pct,
    remarks: values.remarks?.trim() || null,
    is_active: values.is_active,
  });

  return (
    <CrudDialogPair
      entityLabel="HSN / GST"
      {...props}
      form={form}
      onCreate={(values) => props.create.mutateAsync(toCreateBody(values))}
      onEdit={(id, values) => props.patch.mutateAsync({ id, body: toPatchBody(values) })}
      renderFields={() => (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hsn-code">HSN code</Label>
            <Input id="hsn-code" {...form.register('hsn_code')} disabled={props.editing != null} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hsn-date">Effective from</Label>
            <Input id="hsn-date" type="date" {...form.register('effective_from')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cgst">CGST %</Label>
              <Input id="cgst" type="number" step="0.01" {...form.register('cgst_pct')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sgst">SGST %</Label>
              <Input id="sgst" type="number" step="0.01" {...form.register('sgst_pct')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="igst">IGST %</Label>
              <Input id="igst" type="number" step="0.01" {...form.register('igst_pct')} />
            </div>
          </div>
          <ActiveField
            checked={form.watch('is_active')}
            onCheckedChange={(value) => form.setValue('is_active', value)}
          />
        </>
      )}
    />
  );
}

function StoreTypeOperationalFlag({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 md:col-span-2">
      <div className="flex min-w-0 flex-col gap-0.5 pr-2">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function StoreTypeCrudDialog(props: {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: InventoryStoreType | null;
  onEditingChange: (row: InventoryStoreType | null) => void;
  create: ReturnType<typeof useInventoryMasterPost>;
  patch: ReturnType<typeof useInventoryMasterPatch>;
  busy: boolean;
}) {
  const storesQuery = useStores({ status: 'active', pageSize: 200 });
  const stores = storesQuery.data?.data ?? [];

  const defaultValues: z.infer<typeof storeTypeSchema> = {
    name: '',
    description: '',
    ...DEFAULT_STORE_TYPE_OPERATIONAL_CONFIG,
    is_active: true,
  };

  const form = useForm<z.infer<typeof storeTypeSchema>>({
    resolver: zodResolver(storeTypeSchema),
    defaultValues,
  });

  const indentAuthority = form.watch('indent_authority');

  useEffect(() => {
    if (props.createOpen) {
      form.reset(defaultValues);
    }
  }, [props.createOpen, form]);

  useEffect(() => {
    if (props.editing) {
      form.reset({
        name: props.editing.store_type,
        description: props.editing.description ?? '',
        can_receive_stock: props.editing.can_receive_stock,
        can_dispense: props.editing.can_dispense,
        can_issue_to_ward: props.editing.can_issue_to_ward,
        track_batch_expiry: props.editing.track_batch_expiry,
        indent_authority: props.editing.indent_authority,
        default_indent_target_store_id: props.editing.default_indent_target_store_id,
        is_active: props.editing.status === 'active',
      });
    }
  }, [props.editing, form]);

  const buildOperationalBody = (values: z.infer<typeof storeTypeSchema>) => ({
    can_receive_stock: values.can_receive_stock,
    can_dispense: values.can_dispense,
    can_issue_to_ward: values.can_issue_to_ward,
    track_batch_expiry: values.track_batch_expiry,
    indent_authority: values.indent_authority,
    default_indent_target_store_id: values.indent_authority
      ? values.default_indent_target_store_id
      : null,
  });

  const toCreateBody = (values: z.infer<typeof storeTypeSchema>) => ({
    name: values.name.trim(),
    description: values.description?.trim() ?? '',
    is_active: values.is_active,
    ...buildOperationalBody(values),
  });

  const toPatchBody = (values: z.infer<typeof storeTypeSchema>) => ({
    name: values.name.trim(),
    description: values.description?.trim() ?? '',
    is_active: values.is_active,
    ...buildOperationalBody(values),
  });

  return (
    <CrudDialogPair
      entityLabel="Store type"
      {...props}
      form={form}
      onCreate={(values) => props.create.mutateAsync(toCreateBody(values))}
      onEdit={(id, values) => props.patch.mutateAsync({ id, body: toPatchBody(values) })}
      renderFields={() => (
        <>
          {props.editing ? (
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="store-code">Store type code</Label>
              <Input
                id="store-code"
                className="font-mono"
                value={props.editing.code}
                readOnly
                disabled
              />
            </div>
          ) : null}
          <div className={`flex flex-col gap-2 ${props.editing ? '' : 'md:col-span-2'}`}>
            <Label htmlFor="store-name">
              Store type name <span className="text-destructive">*</span>
            </Label>
            <Input id="store-name" {...form.register('name')} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="store-desc">Description</Label>
            <Textarea
              id="store-desc"
              className="min-h-[72px] resize-y"
              placeholder={`Optional (max ${STORE_TYPE_DESCRIPTION_MAX_LENGTH} characters)`}
              maxLength={STORE_TYPE_DESCRIPTION_MAX_LENGTH}
              {...form.register('description')}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 md:col-span-2">
            <div className="flex min-w-0 flex-col gap-0.5 pr-2">
              <Label htmlFor="store-status" className="text-sm font-medium text-foreground">
                Status
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive types are hidden when creating new stores. Existing stores are unchanged.
              </p>
            </div>
            <ActiveField
              checked={form.watch('is_active')}
              onCheckedChange={(value) => form.setValue('is_active', value)}
            />
          </div>
          <div className="flex flex-col gap-3 md:col-span-2">
            <p className="text-sm font-medium text-foreground">Default operational configuration</p>
            <p className="text-xs text-muted-foreground">
              New stores inherit these settings. Changes apply only to stores created after you save.
            </p>
            <StoreTypeOperationalFlag
              id="store-receive"
              label="Can Receive Stock"
              hint="GRN and transfer destination"
              checked={form.watch('can_receive_stock')}
              onCheckedChange={(value) => form.setValue('can_receive_stock', value)}
            />
            <StoreTypeOperationalFlag
              id="store-dispense"
              label="Can Dispense to Patient"
              hint="Queue, dispensing, counter sale"
              checked={form.watch('can_dispense')}
              onCheckedChange={(value) => form.setValue('can_dispense', value)}
            />
            <StoreTypeOperationalFlag
              id="store-ward"
              label="Can Issue to Ward"
              hint="Ward issue workflows"
              checked={form.watch('can_issue_to_ward')}
              onCheckedChange={(value) => form.setValue('can_issue_to_ward', value)}
            />
            <StoreTypeOperationalFlag
              id="store-batch"
              label="Track Batch & Expiry"
              hint="Batch and expiry mandatory"
              checked={form.watch('track_batch_expiry')}
              onCheckedChange={(value) => form.setValue('track_batch_expiry', value)}
            />
            <StoreTypeOperationalFlag
              id="store-indent"
              label="Indent Authority"
              hint="Create indent action enabled"
              checked={form.watch('indent_authority')}
              onCheckedChange={(value) => form.setValue('indent_authority', value)}
            />
            {indentAuthority ? (
              <div className="flex flex-col gap-2 md:col-span-2">
                <Label htmlFor="store-indent-target">Default indent target store</Label>
                <Select
                  value={form.watch('default_indent_target_store_id') ?? NONE_STORE_VALUE}
                  onValueChange={(value) =>
                    form.setValue(
                      'default_indent_target_store_id',
                      value === NONE_STORE_VALUE ? null : value,
                    )
                  }
                  disabled={storesQuery.isPending}
                >
                  <SelectTrigger id="store-indent-target">
                    <SelectValue
                      placeholder={storesQuery.isPending ? 'Loading stores…' : 'Select store (optional)'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_STORE_VALUE}>None</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store_code} — {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </>
      )}
    />
  );
}

function ManufacturerCrudDialog(props: {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: InventoryManufacturer | null;
  onEditingChange: (row: InventoryManufacturer | null) => void;
  create: ReturnType<typeof useInventoryMasterPost>;
  patch: ReturnType<typeof useInventoryMasterPatch>;
  busy: boolean;
}) {
  const form = useForm<z.infer<typeof manufacturerSchema>>({
    resolver: zodResolver(manufacturerSchema),
    defaultValues: { code: '', display_name: '', is_active: true },
  });

  useEffect(() => {
    if (props.createOpen) form.reset({ code: '', display_name: '', is_active: true });
  }, [props.createOpen, form]);

  useEffect(() => {
    if (props.editing) {
      form.reset({
        code: props.editing.code ?? '',
        display_name: props.editing.manufacturer,
        is_active: props.editing.status === 'active',
      });
    }
  }, [props.editing, form]);

  const toCreateBody = (values: z.infer<typeof manufacturerSchema>) => ({
    code: values.code,
    display_name: values.display_name,
    display_order: 0,
    is_active: values.is_active,
  });

  const toPatchBody = (values: z.infer<typeof manufacturerSchema>) => ({
    display_name: values.display_name,
    is_active: values.is_active,
  });

  return (
    <CrudDialogPair
      entityLabel="Manufacturer"
      {...props}
      form={form}
      onCreate={(values) => props.create.mutateAsync(toCreateBody(values))}
      onEdit={(id, values) => props.patch.mutateAsync({ id, body: toPatchBody(values) })}
      renderFields={() => (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mfr-code">Code</Label>
            <Input id="mfr-code" {...form.register('code')} disabled={props.editing != null} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mfr-name">Display name</Label>
            <Input id="mfr-name" {...form.register('display_name')} />
          </div>
          <ActiveField
            checked={form.watch('is_active')}
            onCheckedChange={(value) => form.setValue('is_active', value)}
          />
        </>
      )}
    />
  );
}

function CrudDialogPair<T extends Record<string, unknown>>({
  entityLabel,
  createOpen,
  onCreateOpenChange,
  editing,
  onEditingChange,
  busy,
  form,
  onCreate,
  onEdit,
  renderFields,
}: {
  entityLabel: string;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: { id: string } | null;
  onEditingChange: (row: null) => void;
  busy: boolean;
  form: ReturnType<typeof useForm<T>>;
  onCreate: (values: T) => Promise<unknown>;
  onEdit: (id: string, values: T) => Promise<unknown>;
  renderFields: () => ReactNode;
}) {
  const submitCreate: SubmitHandler<T> = async (values) => {
    try {
      await onCreate(values);
      toast.success(`${entityLabel} created`);
      onCreateOpenChange(false);
    } catch (error) {
      toast.error(mutationErrorMessage(error));
    }
  };

  const submitEdit: SubmitHandler<T> = async (values) => {
    if (!editing) return;
    try {
      await onEdit(editing.id, values);
      toast.success(`${entityLabel} updated`);
      onEditingChange(null);
    } catch (error) {
      toast.error(mutationErrorMessage(error));
    }
  };

  return (
    <>
      <EntityFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        title={`Add ${entityLabel}`}
        submitLabel="Create"
        loading={busy}
        onSubmit={form.handleSubmit(submitCreate)}
      >
        <div className="flex flex-col gap-4">{renderFields()}</div>
      </EntityFormDialog>
      <EntityFormDialog
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) onEditingChange(null);
        }}
        title={`Edit ${entityLabel}`}
        submitLabel="Save"
        loading={busy}
        onSubmit={form.handleSubmit(submitEdit)}
      >
        <div className="flex flex-col gap-4">{renderFields()}</div>
      </EntityFormDialog>
    </>
  );
}
