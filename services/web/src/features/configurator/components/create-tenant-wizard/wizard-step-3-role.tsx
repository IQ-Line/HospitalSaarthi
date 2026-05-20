import { useCallback, useEffect, useMemo, type ComponentProps } from 'react';
import type { UseFormRegister } from 'react-hook-form';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import type { WizardFormValues } from '@/features/configurator/create-tenant-wizard-schema';
import type { Module, ModulePermission, Permission } from '@/features/master-data/types';
import type { Capability } from '@/features/user-management/types';
import { buildChildrenMap } from './wizard-helpers';
import {
  buildWizardRolePermissionCatalog,
  countUnmappedMasterDataPermissions,
  defaultSelectableCapabilityIds,
} from './wizard-master-data-permissions';
import {
  filterRootModulesForEnabledSelection,
  indexPermissionOptionsByModuleId,
} from './wizard-module-tree';
import { WizardPermissionModuleTree } from './wizard-permission-module-tree';

export interface WizardStep3RoleProps {
  register: UseFormRegister<WizardFormValues>;
  roleCodeInputProps?: ComponentProps<'input'>;
  enabledModuleIds: Set<string>;
  rootModules: Module[];
  modules: Module[];
  permissions: Permission[];
  modulePermissions: ModulePermission[];
  catalogLoading: boolean;
  catalogError: boolean;
  runtimeCapabilities: Capability[];
  selectedCapabilityIds: string[];
  onSelectedCapabilityIdsChange: (ids: string[]) => void;
}

export function WizardStep3Role({
  register,
  roleCodeInputProps,
  enabledModuleIds,
  rootModules,
  modules,
  permissions,
  modulePermissions,
  catalogLoading,
  catalogError,
  runtimeCapabilities,
  selectedCapabilityIds,
  onSelectedCapabilityIdsChange,
}: WizardStep3RoleProps) {
  const childMap = useMemo(() => buildChildrenMap(modules), [modules]);

  const { options: permissionOptions, selectableCapabilities } = useMemo(
    () =>
      buildWizardRolePermissionCatalog(
        modules,
        permissions,
        modulePermissions,
        enabledModuleIds,
        runtimeCapabilities,
      ),
    [modules, permissions, modulePermissions, enabledModuleIds, runtimeCapabilities],
  );

  const optionsByModuleId = useMemo(
    () => indexPermissionOptionsByModuleId(modules, permissionOptions),
    [modules, permissionOptions],
  );

  const filteredRoots = useMemo(
    () => filterRootModulesForEnabledSelection(rootModules, childMap, enabledModuleIds),
    [rootModules, childMap, enabledModuleIds],
  );

  const unmappedCount = useMemo(
    () => countUnmappedMasterDataPermissions(permissionOptions),
    [permissionOptions],
  );

  const selectedSet = useMemo(() => new Set(selectedCapabilityIds), [selectedCapabilityIds]);

  const allSelectableIds = useMemo(
    () => selectableCapabilities.map((capability) => capability.id),
    [selectableCapabilities],
  );

  useEffect(() => {
    if (selectableCapabilities.length === 0 || selectedCapabilityIds.length > 0) {
      return;
    }
    onSelectedCapabilityIdsChange(
      defaultSelectableCapabilityIds(permissionOptions, selectableCapabilities),
    );
  }, [
    permissionOptions,
    selectableCapabilities,
    selectedCapabilityIds.length,
    onSelectedCapabilityIdsChange,
  ]);

  const toggleCapability = useCallback(
    (capabilityId: string) => {
      const next = selectedCapabilityIds.includes(capabilityId)
        ? selectedCapabilityIds.filter((id) => id !== capabilityId)
        : [...selectedCapabilityIds, capabilityId];
      onSelectedCapabilityIdsChange(next);
    },
    [selectedCapabilityIds, onSelectedCapabilityIdsChange],
  );

  const toggleModuleCapabilities = useCallback(
    (capabilityIds: string[], selected: boolean) => {
      const idSet = new Set(selectedCapabilityIds);
      for (const id of capabilityIds) {
        if (selected) {
          idSet.add(id);
        } else {
          idSet.delete(id);
        }
      }
      onSelectedCapabilityIdsChange([...idSet]);
    },
    [selectedCapabilityIds, onSelectedCapabilityIdsChange],
  );

  return (
    <FieldGroup className="mx-auto max-w-none gap-4">
      <Field>
        <FieldDescription>
          Define the tenant administrator role and choose permissions for the modules you enabled in
          step 2. The layout matches step 2: product module, feature module, then permission
          checkboxes (level-4 catalog rows roll up under their level-3 parent).
        </FieldDescription>
      </Field>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="wiz-role-code">
            Role code <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="wiz-role-code"
              className="h-9 text-sm"
              placeholder="tenant-admin"
              {...(roleCodeInputProps ?? register('adminRoleCode'))}
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-role-name">
            Role display name <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="wiz-role-name"
              className="h-9 text-sm"
              placeholder="Tenant administrator"
              {...register('adminRoleDisplayName')}
            />
          </FieldContent>
        </Field>
      </div>
      <Field>
        <FieldLabel>Permissions (enabled modules only)</FieldLabel>
        <FieldContent className="mt-1 space-y-3">
          {catalogLoading ? (
            <p className="text-xs text-muted-foreground">Loading Master Data permissions…</p>
          ) : catalogError ? (
            <p className="text-sm text-destructive">Could not load the Master Data permission catalog.</p>
          ) : permissionOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No module permissions in Master Data for the selected modules. Add links under Master
              Data → Module permissions, then run <code className="text-xs">pnpm sync:capabilities</code>.
            </p>
          ) : selectableCapabilities.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {permissionOptions.length} permission link(s) exist in Master Data but none are synced
              to User Management yet. Run <code className="text-xs">pnpm sync:capabilities</code>{' '}
              after migrations.
            </p>
          ) : filteredRoots.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No enabled modules from step 2 match the catalog tree. Go back and select modules.
            </p>
          ) : (
            <>
              {unmappedCount > 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {unmappedCount} Master Data permission link(s) are not in the runtime catalog and
                  are hidden. Run sync after updating the catalog.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary">{selectedCapabilityIds.length} selected</Badge>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectedCapabilityIdsChange(allSelectableIds)}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectedCapabilityIdsChange([])}
                  >
                    Clear all
                  </Button>
                </div>
              </div>
              <WizardPermissionModuleTree
                roots={filteredRoots}
                childMap={childMap}
                enabledModuleIds={enabledModuleIds}
                optionsByModuleId={optionsByModuleId}
                selectedCapabilityIds={selectedSet}
                onToggleCapability={toggleCapability}
                onToggleModuleCapabilities={toggleModuleCapabilities}
              />
            </>
          )}
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
