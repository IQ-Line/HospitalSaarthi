import { useEffect, useMemo, type FormEvent } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@pulse/ui/collapsible';
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
import { ChevronDown } from 'lucide-react';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import type { Department } from '@/features/master-data/types';
import type { InventoryStoreType } from '@/features/inventory-masters/types';
import type { InventoryStoreRecord } from '../types';
import type { StoreFormInput } from '../validation';

type StoreFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting?: boolean;
  facilityLabel: string;
  storeTypes: InventoryStoreType[];
  indentTargetStores: InventoryStoreRecord[];
  editingStoreId?: string;
  existingCentralStore?: InventoryStoreRecord | null;
  departments: Department[];
  form: UseFormReturn<StoreFormInput>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function OperationalToggle({
  form,
  name,
  label,
}: {
  form: UseFormReturn<StoreFormInput>;
  name:
    | 'can_receive_stock'
    | 'can_dispense'
    | 'can_issue_to_ward'
    | 'track_batch_expiry'
    | 'indent_authority';
  label: string;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <Label htmlFor={name} className="font-normal">
            {label}
          </Label>
          <Switch
            id={name}
            checked={field.value}
            onCheckedChange={(checked) => {
              field.onChange(checked);
              if (name === 'indent_authority' && !checked) {
                form.setValue('indent_target_store_id', '');
              }
            }}
          />
        </div>
      )}
    />
  );
}

export function StoreFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting,
  facilityLabel,
  storeTypes,
  indentTargetStores,
  editingStoreId,
  existingCentralStore,
  departments,
  form,
  onSubmit,
}: StoreFormDialogProps) {
  const storeTypeId = form.watch('store_type_id');
  const indentAuthority = form.watch('indent_authority');
  const isCentralStore = form.watch('is_central_store');

  const centralStoreTakenByOther =
    Boolean(existingCentralStore) && existingCentralStore?.id !== editingStoreId;

  const indentTargets = useMemo(
    () =>
      indentTargetStores.filter(
        (store) => store.is_active && store.id !== editingStoreId,
      ),
    [indentTargetStores, editingStoreId],
  );

  useEffect(() => {
    if (!storeTypeId) return;
    const selected = storeTypes.find((row) => row.id === storeTypeId);
    if (!selected) return;
    form.setValue('can_receive_stock', selected.can_receive_stock);
    form.setValue('can_dispense', selected.can_dispense);
    form.setValue('can_issue_to_ward', selected.can_issue_to_ward);
    form.setValue('track_batch_expiry', selected.track_batch_expiry);
    form.setValue('indent_authority', selected.indent_authority);
    form.setValue(
      'indent_target_store_id',
      selected.indent_authority ? (selected.default_indent_target_store_id ?? '') : '',
    );
  }, [storeTypeId, storeTypes, form]);

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      submitLabel={submitLabel}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
    >
      <p className="text-xs text-muted-foreground">
        Store code is assigned by the server when you save (e.g. PHA-00001). It cannot be edited
        and does not change if the store type name is renamed later.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="store_name">
            Store name <span className="text-destructive">*</span>
          </Label>
          <Input id="store_name" {...form.register('store_name')} />
          {form.formState.errors.store_name ? (
            <p className="text-xs text-destructive">{form.formState.errors.store_name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>
            Store type <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={form.control}
            name="store_type_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store type" />
                </SelectTrigger>
                <SelectContent>
                  {storeTypes.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.store_type} ({row.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.store_type_id ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.store_type_id.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Facility</Label>
          <Input value={facilityLabel} disabled readOnly />
        </div>

        <div className="space-y-2">
          <Label>
            Department <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={form.control}
            name="department_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.department_id ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.department_id.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="physical_location">Physical location</Label>
          <Input
            id="physical_location"
            placeholder="Floor / building / wing / room"
            {...form.register('physical_location')}
          />
        </div>

        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <Label htmlFor="is_active">Status</Label>
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="is_central_store" className="font-normal">
                Procurement (central store)
              </Label>
              <p className="text-xs text-muted-foreground">
                One per tenant. Only the central store can raise procurement indents.
              </p>
            </div>
            <Controller
              control={form.control}
              name="is_central_store"
              render={({ field }) => (
                <Switch
                  id="is_central_store"
                  checked={field.value}
                  disabled={centralStoreTakenByOther && !isCentralStore}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          {centralStoreTakenByOther && !isCentralStore ? (
            <p className="text-xs text-muted-foreground">
              {existingCentralStore?.store_name} ({existingCentralStore?.store_code}) is already
              the central store for this tenant.
            </p>
          ) : null}
        </div>
      </div>

      <Collapsible defaultOpen className="space-y-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium">
          <span>Operational configuration</span>
          <ChevronDown className="size-4" />
        </CollapsibleTrigger>
        <p className="text-xs text-muted-foreground">
          Inherited from the selected store type. Adjust only when required.
        </p>
        <CollapsibleContent className="grid gap-3 sm:grid-cols-2">
          <OperationalToggle form={form} name="can_receive_stock" label="Can receive stock" />
          <OperationalToggle form={form} name="can_dispense" label="Can dispense to patient" />
          <OperationalToggle form={form} name="can_issue_to_ward" label="Can issue to ward" />
          <OperationalToggle form={form} name="track_batch_expiry" label="Track batch & expiry" />
          <OperationalToggle form={form} name="indent_authority" label="Indent authority" />
          {indentAuthority ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Indent target store <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="indent_target_store_id"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select active store" />
                    </SelectTrigger>
                    <SelectContent>
                      {indentTargets.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.store_name} ({store.store_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.indent_target_store_id ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.indent_target_store_id.message}
                </p>
              ) : null}
              {indentTargets.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Create at least one other active store to use as an indent target.
                </p>
              ) : null}
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </EntityFormDialog>
  );
}
