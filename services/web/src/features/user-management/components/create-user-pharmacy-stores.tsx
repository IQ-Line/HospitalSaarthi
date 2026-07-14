import type { ReactNode } from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Checkbox } from '@pulse/ui/checkbox';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { useInventoryStores } from '@/features/inventory/api/queries';
import type { CreateUserFormValues } from './create-user-form-sections';
import { UserManagementSectionCard } from './user-management-section-card';

type Props = {
  control: Control<CreateUserFormValues>;
  errors: FieldErrors<CreateUserFormValues>;
  /** When both pharmacy + inventory, keep a neutral title. */
  sectionTitle?: string;
  helperText?: string;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </Label>
  );
}

export function CreateUserPharmacyStoresSection({
  control,
  errors,
  sectionTitle = 'Store access',
  helperText = 'Primary store for operational workflows. Required when pharmacy or inventory permissions are selected.',
}: Props) {
  const storesQuery = useInventoryStores();
  const stores = storesQuery.data ?? [];
  const storesLoading = storesQuery.isLoading;
  const storesError = Boolean(storesQuery.error);

  return (
    <UserManagementSectionCard title={sectionTitle} contentClassName="space-y-4">
      <div className="space-y-2">
        <FieldLabel htmlFor="c_primary_store" required>
          Primary store
        </FieldLabel>
        <Controller
          control={control}
          name="primary_store_id"
          render={({ field }) => (
            <Controller
              control={control}
              name="secondary_store_ids"
              render={({ field: secondaryField }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(next) => {
                    field.onChange(next);
                    if (secondaryField.value.includes(next)) {
                      secondaryField.onChange(
                        secondaryField.value.filter((id) => id !== next),
                      );
                    }
                  }}
                  disabled={storesLoading || stores.length === 0}
                >
                  <SelectTrigger id="c_primary_store">
                    <SelectValue
                      placeholder={
                        storesLoading
                          ? 'Loading stores…'
                          : storesError
                            ? 'Unable to load stores'
                            : stores.length === 0
                              ? 'No stores available'
                              : 'Select primary store'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                        {store.store_code ? ` (${store.store_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        />
        <p className="text-xs text-muted-foreground">{helperText}</p>
        <FieldError message={errors.primary_store_id?.message?.toString()} />
      </div>

      <Controller
        control={control}
        name="primary_store_id"
        render={({ field: primaryField }) => (
          <Controller
            control={control}
            name="secondary_store_ids"
            render={({ field: secondaryField }) => {
              const secondaryOptions = stores.filter((store) => store.id !== primaryField.value);
              if (secondaryOptions.length === 0) {
                return <></>;
              }
              return (
                <div className="space-y-2">
                  <Label>Additional stores (optional)</Label>
                  <div className="space-y-2 rounded-md border border-border/60 bg-muted/10 p-3">
                    {secondaryOptions.map((store) => {
                      const checked = secondaryField.value.includes(store.id);
                      return (
                        <label
                          key={store.id}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              const enabled = next === true;
                              if (enabled) {
                                secondaryField.onChange([...secondaryField.value, store.id]);
                                return;
                              }
                              secondaryField.onChange(
                                secondaryField.value.filter((id) => id !== store.id),
                              );
                            }}
                          />
                          <span>
                            {store.name}
                            {store.store_code ? ` (${store.store_code})` : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            }}
          />
        )}
      />
    </UserManagementSectionCard>
  );
}
