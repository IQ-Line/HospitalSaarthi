import type { ReactNode } from 'react';
import type { Control, FieldPath, FieldValues, UseFormSetValue } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { Input } from '@pulse/ui/input';
import { FormNumberInput } from '@/lib/form-number-input';
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
import { useProviderList } from '@/features/user-management/api/queries';
import { useTariffCreateLookups } from '../hooks/use-tariff-create-lookups';
import { TARIFF_PICKLIST_REGISTRATION_FEE, tariffTypeRequiresProvider } from '../lib/tariff-type';
import {
  decodeDoctorTariffDescription,
  formatDoctorTariffMetaSummary,
  isDoctorTariffMetadataDescription,
} from '../lib/doctor-tariff-meta';
import type { TariffService } from '../types';
import type { TariffServiceCreateFormValues, TariffServiceEditFormValues } from '../validation';

const TAX_TYPES = ['EXEMPT', 'CGST_SGST', 'IGST'] as const;
const NONE = '__none__';

type TariffLookups = ReturnType<typeof useTariffCreateLookups>;

function departmentPlaceholder(lookups: TariffLookups): string {
  if (lookups.isLoadingDepartments) return 'Loading…';
  if (lookups.departmentsError) return 'Failed to load departments';
  return 'Select department';
}

function doctorPlaceholder(departmentId: string | null, lookups: TariffLookups): string {
  if (!departmentId) return 'Select department first';
  if (lookups.isLoadingDoctors) return 'Loading…';
  if (lookups.doctorsError) return 'Failed to load doctors';
  if (lookups.doctorOptions.length === 0) return 'No doctors in this department';
  return 'Select doctor';
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} readOnly disabled className="bg-muted/50" />
    </div>
  );
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
                modal={false}
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
                <SelectContent
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                  avoidCollisions={false}
                >
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
  showDescription = true,
  descriptionAside,
}: {
  control: Control<T>;
  children?: ReactNode;
  showDescription?: boolean;
  descriptionAside?: ReactNode;
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
              <FormNumberInput
                id="base_price"
                min={0}
                step="0.01"
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                value={typeof field.value === 'number' ? field.value : Number(field.value) || 0}
                onChange={field.onChange}
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
              <FormNumberInput
                id="tax_percentage"
                min={0}
                max={100}
                step="0.01"
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                value={typeof field.value === 'number' ? field.value : Number(field.value) || 0}
                onChange={field.onChange}
              />
              <FieldError message={fieldState.error?.message} />
            </>
          )}
        />
      </div>
      {showDescription ? (
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
                  placeholder="Optional notes for this charge"
                />
                <FieldError message={fieldState.error?.message} />
              </>
            )}
          />
        </div>
      ) : (
        descriptionAside
      )}
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

function CreateProviderFields({
  control,
  setValue,
  departmentId,
  lookups,
}: {
  control: Control<TariffServiceCreateFormValues>;
  setValue: UseFormSetValue<TariffServiceCreateFormValues>;
  departmentId: string | null;
  lookups: TariffLookups;
}) {
  return (
    <>
      <FormSelect
        control={control}
        name="department_id"
        label="Department"
        placeholder={departmentPlaceholder(lookups)}
        disabled={lookups.isLoadingDepartments || lookups.departmentsError}
        options={lookups.departmentOptions}
        onPicked={() => setValue('provider_id', null)}
      />
      <FormSelect
        control={control}
        name="provider_id"
        label="Doctor"
        placeholder={doctorPlaceholder(departmentId, lookups)}
        disabled={
          !departmentId ||
          lookups.isLoadingDoctors ||
          lookups.doctorsError ||
          lookups.doctorOptions.length === 0
        }
        options={lookups.doctorOptions}
      />
    </>
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
  const tariffType = useWatch({ control, name: 'tariff_type' }) ?? TARIFF_PICKLIST_REGISTRATION_FEE;
  const departmentId = useWatch({ control, name: 'department_id' }) ?? null;
  const lookups = useTariffCreateLookups(lookupsEnabled, tariffType, departmentId, iqTenantId);
  const showProviderFields = tariffTypeRequiresProvider(tariffType);

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
      {showProviderFields ? (
        <CreateProviderFields
          control={control}
          setValue={setValue}
          departmentId={departmentId}
          lookups={lookups}
        />
      ) : null}
    </SharedFields>
  );
}

export function TariffServiceEditFormFields({
  control,
  service,
  iqTenantId,
  lookupsEnabled = true,
}: {
  control: Control<TariffServiceEditFormValues>;
  service: TariffService;
  /** Configurator tenant detail only; tariff-master uses session tenant via api-client. */
  iqTenantId?: string;
  lookupsEnabled?: boolean;
}) {
  const tariffType = service.category ?? TARIFF_PICKLIST_REGISTRATION_FEE;
  const departmentId = useWatch({ control, name: 'department_id' }) ?? service.department_id;
  const lookups = useTariffCreateLookups(lookupsEnabled, tariffType, departmentId, iqTenantId);
  const showProviderFields = tariffTypeRequiresProvider(tariffType);

  const providersQuery = useProviderList(iqTenantId ?? null, {
    enabled: lookupsEnabled && Boolean(service.provider_id),
  });
  const doctorLabel =
    service.provider_id == null
      ? '—'
      : (providersQuery.data?.find((p) => p.id === service.provider_id)?.full_name ??
        service.provider_id);

  const tariffTypeLabel =
    lookups.tariffTypeOptions.find((o) => o.value === tariffType)?.label ?? (tariffType || '—');

  const doctorMeta = isDoctorTariffMetadataDescription(service.description)
    ? decodeDoctorTariffDescription(service.description)
    : null;

  return (
    <SharedFields
      control={control}
      showDescription={doctorMeta === null}
      descriptionAside={
        doctorMeta ? (
          <div className="space-y-2 sm:col-span-2">
            <Label>OPD schedule (from doctor profile)</Label>
            <Input
              readOnly
              disabled
              className="bg-muted/50"
              value={formatDoctorTariffMetaSummary(doctorMeta)}
            />
            <p className="text-xs text-muted-foreground">
              Room and OPD days are saved when you add or edit the doctor in User Management, not
              here.
            </p>
          </div>
        ) : null
      }
    >
      <ReadOnlyField id="service_code" label="Service code" value={service.service_code} />
      <FormSelect
        control={control}
        name="tax_type"
        label="Tax type"
        placeholder="Select tax type"
        options={TAX_TYPES.map((t) => ({ value: t, label: t }))}
      />
      <ReadOnlyField id="tariff_type" label="Tariff type" value={tariffTypeLabel} />
      {showProviderFields ? (
        <>
          <FormSelect
            control={control}
            name="department_id"
            label="Department"
            placeholder={departmentPlaceholder(lookups)}
            disabled={lookups.isLoadingDepartments || lookups.departmentsError}
            options={lookups.departmentOptions}
          />
          <ReadOnlyField id="provider_id" label="Doctor" value={doctorLabel} />
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Service code and doctor cannot be changed after creation. Change department if this
            doctor moved.
          </p>
        </>
      ) : null}
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
    | {
        mode: 'edit';
        control: Control<TariffServiceEditFormValues>;
        service: TariffService;
        iqTenantId?: string;
        lookupsEnabled?: boolean;
      },
) {
  return props.mode === 'create' ? (
    <TariffServiceCreateFormFields
      control={props.control}
      setValue={props.setValue}
      iqTenantId={props.iqTenantId}
      lookupsEnabled={props.lookupsEnabled}
    />
  ) : (
    <TariffServiceEditFormFields
      control={props.control}
      service={props.service}
      iqTenantId={props.iqTenantId}
      lookupsEnabled={props.lookupsEnabled}
    />
  );
}
