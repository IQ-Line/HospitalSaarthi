import { Controller } from 'react-hook-form';
import type { Control, UseFormRegister } from 'react-hook-form';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
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
import { WizardModuleSelectionTree } from './wizard-module-selection-tree';

export interface WizardStep2ModulesProps {
  control: Control<WizardFormValues>;
  register: UseFormRegister<WizardFormValues>;
  modulesLoading: boolean;
  rootModules: Module[];
  childMap: Map<string | null, Module[]>;
  moduleOverrideIds: Set<string>;
  totalModuleCount: number;
  onToggleModule: (id: string) => void;
  onSelectModuleSubtree: (moduleId: string, select: boolean) => void;
  onSelectAllModules: () => void;
  onClearAllModules: () => void;
}

export function WizardStep2Modules({
  control,
  register,
  modulesLoading,
  rootModules,
  childMap,
  moduleOverrideIds,
  totalModuleCount,
  onToggleModule,
  onSelectModuleSubtree,
  onSelectAllModules,
  onClearAllModules,
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
        <FieldTitle className="text-xs font-semibold">Enabled modules</FieldTitle>
        <FieldDescription>
          Choose modules from the Master Data catalog. Expand each product or feature, then tick
          modules or use Select all at any level. Permissions in the next step follow your
          selection.
        </FieldDescription>
        <FieldContent className="mt-2 min-w-0 space-y-3">
          {modulesLoading ? (
            <p className="text-xs text-muted-foreground">Loading modules…</p>
          ) : rootModules.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No modules in master data. Add modules under Master Data first.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary">
                  {moduleOverrideIds.size} of {totalModuleCount} selected
                </Badge>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={onSelectAllModules}>
                    Select all
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={onClearAllModules}>
                    Clear all
                  </Button>
                </div>
              </div>
              <div className="max-h-[min(26rem,48vh)] min-w-0 overflow-y-auto overflow-x-hidden pr-1">
                <WizardModuleSelectionTree
                  roots={rootModules}
                  childMap={childMap}
                  selectedModuleIds={moduleOverrideIds}
                  onToggleModule={onToggleModule}
                  onSelectModuleSubtree={onSelectModuleSubtree}
                />
              </div>
            </>
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
