import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { roleCapabilitiesOptions } from '../api/queries';
import type { ApplyRoleTemplateBody } from '../types';
import {
  buildCapabilityTree,
  CapabilityTreeNodeRow,
  treeBranchIds,
} from './role-management-sections';

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
  /** PDP: GET /roles/:id/capabilities uses role.read. */
  canReadRoleCapabilities: boolean;
  canManageAccess: boolean;
  selectedCapabilityIds: string[];
  onSelectedCapabilityIdsChange: (capabilityIds: string[]) => void;
  /** When false, does not auto-select every capability after the role catalog loads. */
  selectAllCapabilitiesOnLoad?: boolean;
  /** Seeds selection when the role catalog loads (e.g. capabilities already granted to the user). */
  initialSelectedCapabilityIds?: string[];
  /** Hides technical permission codes in the checklist. */
  plainLanguage?: boolean;
};

export function RoleTemplateCapabilityPicker({
  roleId,
  canReadRoleCapabilities,
  canManageAccess,
  selectedCapabilityIds,
  onSelectedCapabilityIdsChange,
  selectAllCapabilitiesOnLoad = true,
  initialSelectedCapabilityIds,
  plainLanguage = false,
}: RoleTemplateCapabilityPickerProps) {
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(new Set());

  const roleCapabilitiesQuery = useQuery({
    ...roleCapabilitiesOptions(roleId),
    enabled: Boolean(roleId) && canReadRoleCapabilities,
    staleTime: 30_000,
  });

  const roleCapabilities = roleCapabilitiesQuery.data ?? [];
  const capabilityTree = useMemo(() => buildCapabilityTree(roleCapabilities), [roleCapabilities]);

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
    const caps = roleCapabilitiesQuery.data;
    if (!caps?.length) {
      onSelectedCapabilityIdsChange([]);
      return;
    }
    if (initialSelectedCapabilityIds !== undefined) {
      const allowed = new Set(caps.map((capability) => capability.id));
      onSelectedCapabilityIdsChange(
        initialSelectedCapabilityIds.filter((capabilityId) => allowed.has(capabilityId)),
      );
      return;
    }
    if (selectAllCapabilitiesOnLoad) {
      onSelectedCapabilityIdsChange(caps.map((capability) => capability.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selection resets when role catalog loads
  }, [roleId, roleCapabilitiesQuery.data, initialSelectedCapabilityIds, selectAllCapabilitiesOnLoad]);

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

  let content: ReactNode;
  if (!canReadRoleCapabilities) {
    content = (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view this role&apos;s permissions.
      </p>
    );
  } else if (roleCapabilitiesQuery.isPending) {
    content = <p className="text-sm text-muted-foreground">Loading permissions...</p>;
  } else if (roleCapabilitiesQuery.isError) {
    content = <p className="text-sm text-destructive">Could not load permissions. Try again.</p>;
  } else if (roleCapabilities.length === 0) {
    content = <p className="text-sm text-muted-foreground">This role has no permissions set up yet.</p>;
  } else {
    const selectedSet = new Set(selectedCapabilityIds);
    content = (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">
            {selectedCapabilityIds.length} selected
          </Badge>
          {canManageAccess ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectedCapabilityIdsChange(roleCapabilities.map((capability) => capability.id));
                }}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectedCapabilityIdsChange([]);
                }}
              >
                Clear all
              </Button>
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          {capabilityTree.map((node) => (
            <CapabilityTreeNodeRow
              key={node.id}
              node={node}
              depth={0}
              canWriteRoles={canManageAccess}
              selectedCapabilityIds={selectedSet}
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
      </>
    );
  }

  return <div className="space-y-3 rounded-lg border p-3">{content}</div>;
}
