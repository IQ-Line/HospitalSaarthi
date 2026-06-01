import { X } from 'lucide-react';
import {
  Controller,
  type Control,
  type FieldErrors,
  useFieldArray,
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
import { cn } from '@pulse/utils';
import type { Department } from '@/features/master-data/types';
import type { CreateUserFormValues } from './create-user-form-sections';
import { UserManagementSectionCard } from './user-management-section-card';

export const OPD_WEEKDAYS = [
  { key: 'M', label: 'M' },
  { key: 'T', label: 'T' },
  { key: 'W', label: 'W' },
  { key: 'Th', label: 'T' },
  { key: 'F', label: 'F' },
  { key: 'Sa', label: 'Sa' },
  { key: 'Su', label: 'Su' },
] as const;

export const DEFAULT_DOCTOR_DEPARTMENT_ROW = {
  department_id: '',
  base_price: 0,
  tax_percentage: 0,
  room_number: '',
  opd_days: [] as string[],
};

export const CONSULTATION_FEE_MAX = 3000;

type CreateUserDoctorDepartmentsSectionProps = {
  control: Control<CreateUserFormValues>;
  errors: FieldErrors<CreateUserFormValues>;
  departments: Department[];
  departmentsLoading: boolean;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function CreateUserDoctorDepartmentsSection({
  control,
  errors,
  departments,
  departmentsLoading,
}: CreateUserDoctorDepartmentsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'department_consultations',
  });

  const rowErrors = errors.department_consultations;

  return (
    <UserManagementSectionCard
      title="Department and OPD details"
      description="Add each department where this doctor consults, with consultation fee and tax."
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ ...DEFAULT_DOCTOR_DEPARTMENT_ROW })}
        >
          + Add department
        </Button>
      }
      contentClassName="space-y-4"
    >
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add at least one department with consultation charges for this doctor.
        </p>
      ) : null}

      {fields.map((field, index) => {
        const itemError = Array.isArray(rowErrors) ? rowErrors[index] : undefined;
        return (
          <div
            key={field.id}
            className="relative space-y-4 rounded-lg border border-border/70 bg-muted/10 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Department {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                aria-label={`Remove department ${index + 1}`}
                onClick={() => remove(index)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`dept_id_${index}`}>Department</Label>
                <Controller
                  control={control}
                  name={`department_consultations.${index}.department_id`}
                  render={({ field: deptField }) => (
                    <Select
                      value={deptField.value || undefined}
                      onValueChange={deptField.onChange}
                      disabled={departmentsLoading}
                    >
                      <SelectTrigger id={`dept_id_${index}`}>
                        <SelectValue
                          placeholder={departmentsLoading ? 'Loading…' : 'Select department'}
                        />
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
                <FieldError message={itemError?.department_id?.message?.toString()} />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`room_${index}`}>Room number</Label>
                <Controller
                  control={control}
                  name={`department_consultations.${index}.room_number`}
                  render={({ field: roomField }) => (
                    <Input id={`room_${index}`} placeholder="Enter room number" {...roomField} />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Saved with user profile in a future release.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`fee_${index}`}>Consultation (₹)</Label>
                <Controller
                  control={control}
                  name={`department_consultations.${index}.base_price`}
                  render={({ field: priceField }) => (
                    <Input
                      id={`fee_${index}`}
                      type="number"
                      min={0}
                      max={CONSULTATION_FEE_MAX}
                      step="0.01"
                      value={priceField.value}
                      onChange={(e) => priceField.onChange(e.target.valueAsNumber || 0)}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Range: ₹0 – ₹{CONSULTATION_FEE_MAX.toLocaleString('en-IN')}
                </p>
                <FieldError message={itemError?.base_price?.message?.toString()} />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`tax_${index}`}>Consultation tax (%)</Label>
                <Controller
                  control={control}
                  name={`department_consultations.${index}.tax_percentage`}
                  render={({ field: taxField }) => (
                    <Input
                      id={`tax_${index}`}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={taxField.value}
                      onChange={(e) => taxField.onChange(e.target.valueAsNumber || 0)}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">0% – 100% (GST / tax on consultation)</p>
                <FieldError message={itemError?.tax_percentage?.message?.toString()} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>OPD days</Label>
                <Controller
                  control={control}
                  name={`department_consultations.${index}.opd_days`}
                  render={({ field: daysField }) => (
                    <div className="flex flex-wrap gap-2">
                      {OPD_WEEKDAYS.map((day) => {
                        const selected = daysField.value?.includes(day.key) ?? false;
                        return (
                          <button
                            key={day.key}
                            type="button"
                            className={cn(
                              'flex size-9 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted',
                            )}
                            aria-pressed={selected}
                            onClick={() => {
                              const next = selected
                                ? (daysField.value ?? []).filter((d) => d !== day.key)
                                : [...(daysField.value ?? []), day.key];
                              daysField.onChange(next);
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Schedule is for display only until OPD scheduling is wired.
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <FieldError message={rowErrors?.message?.toString()} />
      <FieldError message={errors.department_consultations?.root?.message?.toString()} />
    </UserManagementSectionCard>
  );
}
