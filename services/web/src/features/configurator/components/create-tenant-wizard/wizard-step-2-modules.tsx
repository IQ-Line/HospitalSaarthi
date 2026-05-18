import { Controller } from 'react-hook-form';
import type { Control, UseFormRegister } from 'react-hook-form';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { PLAN_OPTIONS, type WizardFormValues } from '@/features/configurator/create-tenant-wizard-schema';
import type { Module } from '@/features/master-data/types';
import { ModuleOverrideTree } from './module-override-tree';

export interface WizardStep2ModulesProps {
  control: Control<WizardFormValues>;
  register: UseFormRegister<WizardFormValues>;
  modulesLoading: boolean;
  rootModules: Module[];
  childMap: Map<string | null, Module[]>;
  moduleOverrideIds: Set<string>;
  onToggleModule: (id: string) => void;
}

export function WizardStep2Modules({
  control,
  register,
  modulesLoading,
  rootModules,
  childMap,
  moduleOverrideIds,
  onToggleModule,
}: WizardStep2ModulesProps) {
  return (
    <FieldGroup className="mx-auto max-w-none gap-4">
      <Field>
        <FieldLabel id="wiz-plan-label">
          Plan <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Controller
            name="planSlug"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 w-full max-w-xl text-sm" aria-labelledby="wiz-plan-label">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldTitle className="text-xs font-semibold">Module overrides (optional)</FieldTitle>
        <FieldDescription>
          Enable modules outside the selected plan. These will be enabled as overrides for this
          tenant.
        </FieldDescription>
        <FieldContent className="mt-2 min-w-0">
          {modulesLoading ? (
            <p className="text-xs text-muted-foreground">Loading modules…</p>
          ) : rootModules.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No modules in master data. Add modules under Master Data first.
            </p>
          ) : (
            <ModuleOverrideTree
              roots={rootModules}
              childMap={childMap}
              selected={moduleOverrideIds}
              toggle={onToggleModule}
            />
          )}
        </FieldContent>
      </Field>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="wiz-trial">Trial end date (optional)</FieldLabel>
          <FieldContent>
            <Input id="wiz-trial" className="h-9 max-w-xs text-sm" type="date" {...register('trialEndDate')} />
          </FieldContent>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="wiz-max-users">Max users override (optional)</FieldLabel>
          <FieldContent>
            <Input
              id="wiz-max-users"
              className="h-9 text-sm"
              inputMode="numeric"
              placeholder="Leave empty for plan default"
              {...register('maxUsersOverride')}
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-max-branches">Max branches override (optional)</FieldLabel>
          <FieldContent>
            <Input
              id="wiz-max-branches"
              className="h-9 text-sm"
              inputMode="numeric"
              placeholder="Leave empty for plan default"
              {...register('maxBranchesOverride')}
            />
          </FieldContent>
        </Field>
      </div>
    </FieldGroup>
  );
}
