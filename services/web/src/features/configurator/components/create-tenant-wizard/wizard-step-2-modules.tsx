import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from '@pulse/ui/field';
import type { Module } from '@/features/master-data/types';
import { WizardModuleSelectionTree } from './wizard-module-selection-tree';

export interface WizardStep2ModulesProps {
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
        <FieldTitle className="text-xs font-semibold">Enabled modules</FieldTitle>
        <FieldDescription>
          Choose modules from the Master Data catalog. Expand each product or feature, then tick
          modules or use Select all at any level.
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
    </FieldGroup>
  );
}
