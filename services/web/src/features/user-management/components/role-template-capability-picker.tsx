import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { CapabilityGate } from '@/components/capability-gate';
import { useCapability } from '@/hooks/use-capability';
import { UM_ROLE_ASSIGN, UM_ROLE_READ } from '@/lib/runtime-capability-keys';
import { roleCapabilitiesOptions } from '../api/queries';
import type { ApplyRoleTemplateBody } from '../types';
import { capabilityIdsSignature } from '../lib/capability-id-set';
import { MasterDataCapabilityPermissionTree } from './master-data-capability-permission-tree';
import { PermissionSelectionScrollRegion } from './permission-selection-scroll-region';

const EMPTY_ROLE_CAPABILITIES: never[] = [];

/** Maps picker state to `POST /users/{id}/roles` body. Exported for unit tests. */
export function buildApplyRoleTemplateRequestBody(
  roleId: string,
  selectedCapabilityIds: string[],
  allRoleCapabilityIds: string[],
): ApplyRoleTemplateBody {
  const body: ApplyRoleTemplateBody = { role_id: roleId };
  if (allRoleCapabilityIds.length === 0) {
    return body;
  }

  const picked = selectedCapabilityIds.filter((id) => allRoleCapabilityIds.includes(id));
  const normalized = picked.length > 0 ? picked : [...allRoleCapabilityIds];
  const isFullSet =
    normalized.length === allRoleCapabilityIds.length &&
    allRoleCapabilityIds.every((id) => normalized.includes(id));

  if (!isFullSet) {
    body.role_template_capability_ids = normalized;
  }

  return body;
}

type RoleTemplateCapabilityPickerProps = {
  roleId: string;
  /** Hospital tenant when managing users outside the signed-in tenant (platform operator). */
  tenantScope?: string;
  selectedCapabilityIds: string[];
  onSelectedCapabilityIdsChange: (capabilityIds: string[]) => void;
  selectAllCapabilitiesOnLoad?: boolean;
  initialSelectedCapabilityIds?: string[];
  /** @deprecated Accordion catalog tree is always used; kept for call-site compatibility. */
  plainLanguage?: boolean;
};

export function RoleTemplateCapabilityPicker({
  roleId,
  tenantScope,
  selectedCapabilityIds,
  onSelectedCapabilityIdsChange,
  selectAllCapabilitiesOnLoad = true,
  initialSelectedCapabilityIds,
}: RoleTemplateCapabilityPickerProps) {
  const umRoleRead = useCapability(UM_ROLE_READ);
  const umRoleAssign = useCapability(UM_ROLE_ASSIGN);

  const roleCapabilitiesQuery = useQuery({
    ...roleCapabilitiesOptions(roleId, tenantScope),
    enabled: Boolean(roleId) && umRoleRead,
    staleTime: 30_000,
  });

  const roleCapabilities = roleCapabilitiesQuery.data ?? EMPTY_ROLE_CAPABILITIES;
  const initialSelectedSignature = capabilityIdsSignature(initialSelectedCapabilityIds ?? []);
  const autoFillSignature = `${roleId}\0${initialSelectedSignature}\0${capabilityIdsSignature(
    roleCapabilities.map((c) => c.id),
  )}`;
  const lastAutoFillSignature = useRef<string | null>(null);

  useEffect(() => {
    lastAutoFillSignature.current = null;
  }, [roleId]);

  useEffect(() => {
    if (!selectAllCapabilitiesOnLoad || roleCapabilities.length === 0) {
      return;
    }
    if (lastAutoFillSignature.current === autoFillSignature) {
      return;
    }
    lastAutoFillSignature.current = autoFillSignature;
    const next =
      initialSelectedCapabilityIds && initialSelectedCapabilityIds.length > 0
        ? initialSelectedCapabilityIds
        : roleCapabilities.map((c) => c.id);
    onSelectedCapabilityIdsChange([...next]);
  }, [
    autoFillSignature,
    roleCapabilities,
    selectAllCapabilitiesOnLoad,
    initialSelectedCapabilityIds,
    onSelectedCapabilityIdsChange,
  ]);

  let body: ReactNode;
  if (!umRoleRead) {
    body = (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view this role&apos;s permissions.
      </p>
    );
  } else if (roleCapabilitiesQuery.isPending) {
    body = <p className="text-sm text-muted-foreground">Loading permissions...</p>;
  } else if (roleCapabilitiesQuery.isError) {
    body = <p className="text-sm text-destructive">Could not load permissions for this role.</p>;
  } else if (roleCapabilities.length === 0) {
    body = (
      <p className="text-sm text-muted-foreground">
        This role has no permissions set up yet.
      </p>
    );
  } else {
    body = (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">{selectedCapabilityIds.length} selected</Badge>
          <CapabilityGate capability={UM_ROLE_ASSIGN}>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectedCapabilityIdsChange(roleCapabilities.map((c) => c.id))}
              >
                Select all
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onSelectedCapabilityIdsChange([])}>
                Clear all
              </Button>
            </div>
          </CapabilityGate>
        </div>
        <PermissionSelectionScrollRegion>
          <MasterDataCapabilityPermissionTree
            capabilities={roleCapabilities}
            selectedCapabilityIds={selectedCapabilityIds}
            onSelectedCapabilityIdsChange={onSelectedCapabilityIdsChange}
            editable={umRoleAssign}
          />
        </PermissionSelectionScrollRegion>
      </div>
    );
  }

  const fillsPanel =
    umRoleRead &&
    !roleCapabilitiesQuery.isPending &&
    !roleCapabilitiesQuery.isError &&
    roleCapabilities.length > 0;

  return (
    <div className={fillsPanel ? 'flex min-h-0 w-full min-w-0 flex-1 flex-col' : 'w-full min-w-0'}>
      {body}
    </div>
  );
}
