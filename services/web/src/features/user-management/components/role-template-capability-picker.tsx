import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import {
  buildCapabilityTree,
  CapabilityTreeNodeRow,
  treeBranchIds,
} from './role-management-sections';

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
  plainLanguage?: boolean;
};

export function RoleTemplateCapabilityPicker({
  roleId,
  tenantScope,
  selectedCapabilityIds,
  onSelectedCapabilityIdsChange,
  selectAllCapabilitiesOnLoad = true,
  initialSelectedCapabilityIds,
  plainLanguage = false,
}: RoleTemplateCapabilityPickerProps) {
  const umRoleRead = useCapability(UM_ROLE_READ);
  const umRoleAssign = useCapability(UM_ROLE_ASSIGN);
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(new Set());

  const roleCapabilitiesQuery = useQuery({
    ...roleCapabilitiesOptions(roleId, tenantScope),
    enabled: Boolean(roleId) && umRoleRead,
    staleTime: 30_000,
  });

  const roleCapabilities = roleCapabilitiesQuery.data ?? EMPTY_ROLE_CAPABILITIES;
  const capabilityTree = useMemo(() => buildCapabilityTree(roleCapabilities), [roleCapabilities]);
  const initialSelectedSignature = capabilityIdsSignature(initialSelectedCapabilityIds ?? []);
  const autoFillSignature = `${roleId}\0${initialSelectedSignature}\0${capabilityIdsSignature(
    roleCapabilities.map((c) => c.id),
  )}`;
  const lastAutoFillSignature = useRef<string | null>(null);

  useEffect(() => {
    const branchIds = treeBranchIds(capabilityTree);
    setExpandedBranchIds((current) => {
      const next = new Set(current);
      if (next.size === 0) {
        branchIds.forEach((branchId) => {
          const depth = branchId.replace(/^branch:/, '').split('/').filter(Boolean).length;
          if (depth <= 1) {
            next.add(branchId);
          }
        });
        return next;
      }
      branchIds.forEach((branchId) => {
        if (!next.has(branchId) && branchId.replace(/^branch:/, '').split('/').filter(Boolean).length === 1) {
          next.add(branchId);
        }
      });
      return next;
    });
  }, [capabilityTree]);

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

  const handleToggleBranch = (nodeId: string) => {
    setExpandedBranchIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

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
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
        {plainLanguage ? (
          <MasterDataCapabilityPermissionTree
            capabilities={roleCapabilities}
            selectedCapabilityIds={selectedCapabilityIds}
            onSelectedCapabilityIdsChange={onSelectedCapabilityIdsChange}
            editable={umRoleAssign}
          />
        ) : (
          <div className="space-y-4">
            {capabilityTree.map((node) => (
              <CapabilityTreeNodeRow
                key={node.id}
                node={node}
                depth={0}
                capabilitiesEditable={umRoleAssign}
                selectedCapabilityIds={new Set(selectedCapabilityIds)}
                expandedBranchIds={expandedBranchIds}
                forceExpanded={false}
                onBranchToggle={handleToggleBranch}
                onSetSelectedCapabilityIds={onSelectedCapabilityIdsChange}
                onToggleCapability={(capabilityId) => {
                  const next = selectedCapabilityIds.includes(capabilityId)
                    ? selectedCapabilityIds.filter((id) => id !== capabilityId)
                    : [...selectedCapabilityIds, capabilityId];
                  onSelectedCapabilityIdsChange(next);
                }}
                plainLanguage={plainLanguage}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <>{body}</>;
}
