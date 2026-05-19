import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { runtimeCapabilityCatalogOptions } from '@/features/user-management/api/queries';
import {
  buildCapabilityTree,
  CapabilityTreeNodeRow,
  treeBranchIds,
} from '@/features/user-management/components/role-management-sections';
import type { WizardFormValues } from '@/features/configurator/create-tenant-wizard-schema';
import type { Module } from '@/features/master-data/types';
import {
  defaultTenantAdminCapabilityIds,
  filterCapabilitiesForEnabledModules,
  moduleSlugsForIds,
} from './wizard-capability-helpers';

export interface WizardStep3RoleProps {
  register: UseFormRegister<WizardFormValues>;
  roleCodeInputProps?: ComponentProps<'input'>;
  enabledModuleIds: Set<string>;
  modules: Module[];
  selectedCapabilityIds: string[];
  onSelectedCapabilityIdsChange: (ids: string[]) => void;
}

export function WizardStep3Role({
  register,
  roleCodeInputProps,
  enabledModuleIds,
  modules,
  selectedCapabilityIds,
  onSelectedCapabilityIdsChange,
}: WizardStep3RoleProps) {
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(() => new Set());

  const enabledSlugs = useMemo(
    () => moduleSlugsForIds(enabledModuleIds, modules),
    [enabledModuleIds, modules],
  );

  const capabilitiesQuery = useQuery({
    ...runtimeCapabilityCatalogOptions(),
    staleTime: 60_000,
  });

  const scopedCapabilities = useMemo(() => {
    const all = capabilitiesQuery.data ?? [];
    return filterCapabilitiesForEnabledModules(all, enabledSlugs);
  }, [capabilitiesQuery.data, enabledSlugs]);

  const capabilityTree = useMemo(
    () => buildCapabilityTree(scopedCapabilities),
    [scopedCapabilities],
  );

  useEffect(() => {
    if (scopedCapabilities.length === 0 || selectedCapabilityIds.length > 0) {
      return;
    }
    onSelectedCapabilityIdsChange(defaultTenantAdminCapabilityIds(scopedCapabilities));
  }, [scopedCapabilities, selectedCapabilityIds.length, onSelectedCapabilityIdsChange]);

  useEffect(() => {
    const branchIds = treeBranchIds(capabilityTree);
    setExpandedBranchIds((current) => {
      const next = new Set(current);
      branchIds.forEach((branchId) => {
        const depth = branchId.replace(/^branch:/, '').split('/').filter(Boolean).length;
        if (depth <= 1) next.add(branchId);
      });
      return next;
    });
  }, [capabilityTree]);

  const selectedSet = new Set(selectedCapabilityIds);

  return (
    <FieldGroup className="mx-auto max-w-none gap-4">
      <Field>
        <FieldDescription>
          Define the tenant administrator role and choose permissions for the modules enabled in the
          previous step. Uncheck any permission the admin should not have.
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
        <FieldLabel>Permissions</FieldLabel>
        <FieldContent className="mt-1 space-y-3">
          {capabilitiesQuery.isPending ? (
            <p className="text-xs text-muted-foreground">Loading permissions…</p>
          ) : capabilitiesQuery.isError ? (
            <p className="text-sm text-destructive">Could not load the capability catalog.</p>
          ) : scopedCapabilities.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No permissions match the selected modules. Enable at least user-management in step 2.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary">{selectedCapabilityIds.length} selected</Badge>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onSelectedCapabilityIdsChange(scopedCapabilities.map((c) => c.id))
                    }
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
              <div className="max-h-[min(22rem,40vh)] space-y-4 overflow-y-auto rounded-lg border p-3">
                {capabilityTree.map((node) => (
                  <CapabilityTreeNodeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    capabilitiesEditable
                    selectedCapabilityIds={selectedSet}
                    expandedBranchIds={expandedBranchIds}
                    forceExpanded={false}
                    onBranchToggle={(nodeId) => {
                      setExpandedBranchIds((current) => {
                        const next = new Set(current);
                        if (next.has(nodeId)) next.delete(nodeId);
                        else next.add(nodeId);
                        return next;
                      });
                    }}
                    onSetSelectedCapabilityIds={onSelectedCapabilityIdsChange}
                    onToggleCapability={(capabilityId) => {
                      const next = selectedCapabilityIds.includes(capabilityId)
                        ? selectedCapabilityIds.filter((id) => id !== capabilityId)
                        : [...selectedCapabilityIds, capabilityId];
                      onSelectedCapabilityIdsChange(next);
                    }}
                    plainLanguage
                  />
                ))}
              </div>
            </>
          )}
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
