import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { Controller, useFieldArray, type Control, type FieldErrors } from 'react-hook-form';
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
import { useDepartments } from '@/features/master-data/api';
import type { CreateUserFormValues } from './create-user-form-sections';
import { UserManagementSectionCard } from './user-management-section-card';

export const EMPTY_DOCTOR_TARIFF_ROW = {
  department_id: '',
  room_number: '',
  base_price: 0,
  tax_percentage: 0,
  opd_days: [] as string[],
};

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

type Props = {
  control: Control<CreateUserFormValues>;
  errors: FieldErrors<CreateUserFormValues>;
  iqTenantId?: string;
};

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function DepartmentBlock({
  index,
  control,
  departments,
  deptLoading,
  onRemove,
}: {
  index: number;
  control: Control<CreateUserFormValues>;
  departments: { id: string; name: string }[];
  deptLoading: boolean;
  onRemove: () => void;
}) {
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
            name={`doctor_tariffs.${index}.department_id`}
            render={({ field }) => (
              <Select
                value={field.value || undefined}
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
            name={`doctor_tariffs.${index}.room_number`}
            render={({ field }) => (
              <Input
                id={`room_${index}`}
                placeholder="Enter Room Number"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`fee_${index}`}>Consultation (₹)</Label>
          <Controller
            control={control}
            name={`doctor_tariffs.${index}.base_price`}
            render={({ field }) => (
              <Input
                id={`fee_${index}`}
                type="number"
                min={0}
                max={CONSULTATION_MAX}
                step="1"
                placeholder="0"
                value={Number.isFinite(field.value) ? field.value : ''}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
              />
            )}
          />
          <FieldHint>Range: ₹0 - ₹{CONSULTATION_MAX.toLocaleString('en-IN')}</FieldHint>
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label htmlFor={`tax_${index}`}>Consultation tax (%)</Label>
          <Controller
            control={control}
            name={`doctor_tariffs.${index}.tax_percentage`}
            render={({ field }) => (
              <Input
                id={`tax_${index}`}
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="0"
                value={Number.isFinite(field.value) ? field.value : ''}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
              />
            )}
          />
          <FieldHint>0% - 100% (GST / tax on consultation)</FieldHint>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>OPD Days</Label>
          <Controller
            control={control}
            name={`doctor_tariffs.${index}.opd_days`}
            render={({ field }) => (
              <ToggleGroup
                type="multiple"
                value={field.value ?? []}
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

export function CreateUserDoctorOpdSection({ control, errors, iqTenantId }: Props) {
  const { data: deptData, isLoading: deptLoading } = useDepartments(undefined, {
    iqTenantId,
    formCatalog: true,
  });
  const departments = (deptData?.data ?? []).filter((d) => d.is_active);
  const { fields, append, remove } = useFieldArray({ control, name: 'doctor_tariffs' });
  const rootError = errors.doctor_tariffs?.message ?? errors.doctor_tariffs?.root?.message;

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
          onClick={() => append({ ...EMPTY_DOCTOR_TARIFF_ROW })}
        >
          <Plus className="mr-1 size-4" />
          Add Department
        </Button>
      }
      contentClassName="space-y-4"
    >
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add departments where this doctor consults, with fees and OPD schedule.
        </p>
      ) : null}
      {fields.map((field, index) => (
        <DepartmentBlock
          key={field.id}
          index={index}
          control={control}
          departments={departments}
          deptLoading={deptLoading}
          onRemove={() => remove(index)}
        />
      ))}
      {rootError ? <p className="text-sm text-destructive">{String(rootError)}</p> : null}
    </UserManagementSectionCard>
  );
}
