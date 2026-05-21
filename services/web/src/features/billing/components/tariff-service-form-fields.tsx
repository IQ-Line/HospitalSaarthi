import type { ReactNode } from 'react';
import type { Control, FieldPath, FieldValues, UseFormSetValue } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
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
import { useTariffCreateLookups } from '../hooks/use-tariff-create-lookups';
import type { TariffFormType } from '../lib/tariff-type';
import type { TariffServiceCreateFormValues, TariffServiceEditFormValues } from '../validation';

const TAX_TYPES = ['EXEMPT', 'CGST_SGST', 'IGST'] as const;
const NONE = '__none__';

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  disabled,
  onPicked,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  onPicked?: (value: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          const raw = field.value as string | null | undefined;
          const value = raw && raw !== '' ? raw : NONE;
          return (
            <>
              <Select
                value={value}
                disabled={disabled}
                onValueChange={(v) => {
                  const next = v === NONE ? null : v;
                  field.onChange(next);
                  onPicked?.(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{placeholder ?? 'Select'}</SelectItem>
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldState.error?.message} />
            </>
          );
        }}
      />
    </div>
  );
}

function SharedFields<T extends TariffServiceCreateFormValues | TariffServiceEditFormValues>({
  control,
  children,
}: {
  control: Control<T>;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {children}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="service_name">Service name</Label>
        <Controller
          name={'service_name' as FieldPath<T>}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input id="service_name" {...field} value={field.value as string} />
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="base_price">Base price</Label>
        <Controller
          name={'base_price' as FieldPath<T>}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input
                id="base_price"
                type="number"
                min={0}
                step="0.01"
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                ref={field.ref}
                value={field.value as number}
              />
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tax_percentage">Tax %</Label>
        <Controller
          name={'tax_percentage' as FieldPath<T>}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input
                id="tax_percentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                ref={field.ref}
                value={field.value as number}
              />
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Controller
          name={'description' as FieldPath<T>}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Textarea
                id="description"
                value={(field.value as string | null) ?? ''}
                onChange={field.onChange}
                rows={2}
              />
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="effective_from">Effective from</Label>
        <Controller
          name={'effective_from' as FieldPath<T>}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input
                id="effective_from"
                type="datetime-local"
                value={(field.value as string) ?? ''}
                onChange={field.onChange}
              />
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="effective_to">Effective to</Label>
        <Controller
          name={'effective_to' as FieldPath<T>}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input
                id="effective_to"
                type="datetime-local"
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={field.onChange}
              />
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Controller
          name={'is_active' as FieldPath<T>}
          control={control}
          render={({ field }) => (
            <Switch checked={field.value as boolean} onCheckedChange={field.onChange} id="is_active" />
          )}
        />
        <Label htmlFor="is_active">Active (chargeable)</Label>
      </div>
    </div>
  );
}

export function TariffServiceCreateFormFields({
  control,
  setValue,
  iqTenantId,
  lookupsEnabled = true,
}: {
  control: Control<TariffServiceCreateFormValues>;
  setValue: UseFormSetValue<TariffServiceCreateFormValues>;
  /** Configurator tenant detail only; tariff-master uses session tenant via api-client. */
  iqTenantId?: string;
  lookupsEnabled?: boolean;
}) {
  const tariffType = (useWatch({ control, name: 'tariff_type' }) ?? 'registration') as TariffFormType;
  const departmentId = useWatch({ control, name: 'department_id' }) ?? null;
  const lookups = useTariffCreateLookups(lookupsEnabled, tariffType, departmentId, iqTenantId);

  return (
    <SharedFields control={control}>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="service_code">Service code</Label>
        <Controller
          name="service_code"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input id="service_code" {...field} placeholder="e.g. CONS_GENERAL" />
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
      </div>
      <FormSelect
        control={control}
        name="tax_type"
        label="Tax type"
        placeholder="Select tax type"
        options={TAX_TYPES.map((t) => ({ value: t, label: t }))}
      />
      <FormSelect
        control={control}
        name="tariff_type"
        label="Tariff type"
        placeholder={lookups.isLoadingPicklists ? 'Loading…' : 'Select tariff type'}
        disabled={lookups.isLoadingPicklists || lookups.tariffTypeOptions.length === 0}
        options={lookups.tariffTypeOptions}
        onPicked={() => {
          setValue('department_id', null);
          setValue('provider_id', null);
        }}
      />
      {tariffType === 'opd' ? (
        <>
          <FormSelect
            control={control}
            name="department_id"
            label="Department"
            placeholder={
              lookups.isLoadingDepartments
                ? 'Loading…'
                : lookups.departmentsError
                  ? 'Failed to load departments'
                  : 'Select department'
            }
            disabled={lookups.isLoadingDepartments || lookups.departmentsError}
            options={lookups.departmentOptions}
            onPicked={() => setValue('provider_id', null)}
          />
          <FormSelect
            control={control}
            name="provider_id"
            label="Doctor"
            placeholder={
              !departmentId
                ? 'Select department first'
                : lookups.isLoadingDoctors
                  ? 'Loading…'
                  : lookups.doctorsError
                    ? 'Failed to load doctors'
                    : lookups.doctorOptions.length === 0
                      ? 'No doctors in this department'
                      : 'Select doctor'
            }
            disabled={
              !departmentId ||
              lookups.isLoadingDoctors ||
              lookups.doctorsError ||
              lookups.doctorOptions.length === 0
            }
            options={lookups.doctorOptions}
          />
        </>
      ) : null}
    </SharedFields>
  );
}

export function TariffServiceEditFormFields({
  control,
}: {
  control: Control<TariffServiceEditFormValues>;
}) {
  return (
    <SharedFields control={control}>
      <FormSelect
        control={control}
        name="tax_type"
        label="Tax type"
        placeholder="Select tax type"
        options={TAX_TYPES.map((t) => ({ value: t, label: t }))}
      />
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Controller
          name="department"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input id="department" value={field.value ?? ''} onChange={field.onChange} />
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
      </div>
    </SharedFields>
  );
}

/** @deprecated Use TariffServiceCreateFormFields or TariffServiceEditFormFields */
export function TariffServiceFormFields(
  props:
  | {
      mode: 'create';
      control: Control<TariffServiceCreateFormValues>;
      setValue: UseFormSetValue<TariffServiceCreateFormValues>;
      iqTenantId?: string;
      lookupsEnabled?: boolean;
    }
    | { mode: 'edit'; control: Control<TariffServiceEditFormValues> },
) {
  return props.mode === 'create' ? (
    <TariffServiceCreateFormFields
      control={props.control}
      setValue={props.setValue}
      iqTenantId={props.iqTenantId}
      lookupsEnabled={props.lookupsEnabled}
    />
  ) : (
    <TariffServiceEditFormFields control={props.control} />
  );
}
