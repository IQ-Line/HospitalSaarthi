import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import {
  Controller,
  useFieldArray,
  type ArrayPath,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@pulse/ui/toggle-group';
import { cn } from '@pulse/utils';
import { FormNumberInput } from '@/lib/form-number-input';
import { useDepartments } from '@/features/master-data/api';
import { EMPTY_DOCTOR_TARIFF_ROW } from '../lib/doctor-tariff-form';
import { UserManagementSectionCard } from './user-management-section-card';

export { EMPTY_DOCTOR_TARIFF_ROW };

const CONSULTATION_MAX = 3000;

const OPD_DAYS = [
  { value: 'mon', label: 'M' },
  { value: 'tue', label: 'T' },
  { value: 'wed', label: 'W' },
  { value: 'thu', label: 'T' },
  { value: 'fri', label: 'F' },
  { value: 'sat', label: 'Sa' },
  { value: 'sun', label: 'Su' },
] as const;

// Widened to the catalog-form control pattern: T = RHF working (input) values,
// TT = zodResolver-transformed (output) values. All doctor_tariffs field access
// below is path-cast, so a generic FieldValues bound is sufficient and lets the
// 3-generic `useForm` control (Control<Input, unknown, Output>) flow in unchanged.
type Props<T extends FieldValues, TT extends FieldValues = T> = {
  control: Control<T, unknown, TT>;
  errors: FieldErrors<T>;
  iqTenantId?: string;
  /** Minimum department rows (default 1 for doctors). */
  minRows?: number;
};

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function DepartmentBlock<T extends FieldValues, TT extends FieldValues = T>({
  index,
  control,
  departments,
  deptLoading,
  canRemove,
  onRemove,
}: {
  index: number;
  control: Control<T, unknown, TT>;
  departments: { id: string; name: string }[];
  deptLoading: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const namePrefix = `doctor_tariffs.${index}` as Path<T>;

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Department {index + 1}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove department ${index + 1}`}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Department</Label>
          <Controller
            control={control}
            name={`${namePrefix}.department_id` as Path<T>}
            render={({ field }) => (
              <Select
                value={(field.value as string) || undefined}
                onValueChange={field.onChange}
                disabled={deptLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
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
        </div>

        <div className="space-y-2">
          <Label htmlFor={`room_${index}`}>Room Number</Label>
          <Controller
            control={control}
            name={`${namePrefix}.room_number` as Path<T>}
            render={({ field }) => (
              <Input
                id={`room_${index}`}
                placeholder="Enter Room Number"
                value={(field.value as string) ?? ''}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`fee_${index}`}>Consultation (₹)</Label>
          <Controller
            control={control}
            name={`${namePrefix}.base_price` as Path<T>}
            render={({ field }) => (
              <FormNumberInput
                id={`fee_${index}`}
                min={0}
                max={CONSULTATION_MAX}
                step="1"
                placeholder="0"
                value={typeof field.value === 'number' ? field.value : 0}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
          <FieldHint>Range: ₹0 - ₹{CONSULTATION_MAX.toLocaleString('en-IN')}</FieldHint>
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label htmlFor={`tax_${index}`}>Consultation tax (%)</Label>
          <Controller
            control={control}
            name={`${namePrefix}.tax_percentage` as Path<T>}
            render={({ field }) => (
              <FormNumberInput
                id={`tax_${index}`}
                min={0}
                max={100}
                step="0.01"
                placeholder="0"
                value={typeof field.value === 'number' ? field.value : 0}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
          <FieldHint>0% - 100% (GST / tax on consultation)</FieldHint>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>OPD Days</Label>
          <Controller
            control={control}
            name={`${namePrefix}.opd_days` as Path<T>}
            render={({ field }) => (
              <ToggleGroup
                type="multiple"
                value={(field.value as string[]) ?? []}
                onValueChange={field.onChange}
                className="flex flex-wrap gap-2"
              >
                {OPD_DAYS.map((day) => (
                  <ToggleGroupItem
                    key={day.value}
                    value={day.value}
                    aria-label={day.value}
                    className={cn(
                      'size-9 rounded-md border border-border/80 px-0 text-xs font-medium',
                      'data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
                    )}
                  >
                    {day.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
        </div>
      </div>
    </div>
  );
}

export function CreateUserDoctorOpdSection<T extends FieldValues, TT extends FieldValues = T>({
  control,
  errors,
  iqTenantId,
  minRows = 1,
}: Props<T, TT>) {
  const { data: deptData, isLoading: deptLoading } = useDepartments(undefined, {
    iqTenantId,
    formCatalog: true,
  });
  const departments = (deptData?.data ?? []).filter((d) => d.is_active);
  const { fields, append, remove } = useFieldArray({ control, name: 'doctor_tariffs' as ArrayPath<T> });
  const rootError =
    (errors.doctor_tariffs as { message?: string; root?: { message?: string } } | undefined)
      ?.message ??
    (errors.doctor_tariffs as { root?: { message?: string } } | undefined)?.root?.message;

  return (
    <UserManagementSectionCard
      title="Department and OPD Details"
      className="border-border/60 bg-muted/30"
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={deptLoading}
          onClick={() => append({ ...EMPTY_DOCTOR_TARIFF_ROW } as never)}
        >
          <Plus className="mr-1 size-4" />
          Add Department
        </Button>
      }
      contentClassName="space-y-4"
    >
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add at least one department where this doctor consults, with fees and OPD schedule.
        </p>
      ) : null}
      {fields.map((field, index) => (
        <DepartmentBlock
          key={field.id}
          index={index}
          control={control}
          departments={departments}
          deptLoading={deptLoading}
          canRemove={fields.length > minRows}
          onRemove={() => {
            if (fields.length <= minRows) return;
            remove(index);
          }}
        />
      ))}
      {rootError ? <p className="text-sm text-destructive">{String(rootError)}</p> : null}
    </UserManagementSectionCard>
  );
}
