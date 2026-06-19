import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CapabilityGate } from '@/components/capability-gate';
import { useCapability } from '@/hooks/use-capability';
import {
  UM_CAPABILITY_READ,
  UM_ROLE_CREATE,
  UM_ROLE_UPDATE,
} from '@/lib/runtime-capability-keys';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Textarea } from '@pulse/ui/textarea';
import { useRoleTypePicklistValues } from '@/features/master-data/api';
import type { Capability, UmRole } from '../types';
import { MasterDataCapabilityPermissionTree } from './master-data-capability-permission-tree';
import { PermissionSelectionScrollRegion } from './permission-selection-scroll-region';
import { UserManagementSectionCard } from './user-management-section-card';

export function groupCapabilitiesByModule(capabilities: Capability[]): Record<string, Capability[]> {
  return capabilities.reduce<Record<string, Capability[]>>((acc, capability) => {
    const current = acc[capability.module] ?? [];
    acc[capability.module] = [...current, capability];
    return acc;
  }, {});
}

type RoleListSectionProps = {
  roles: UmRole[];
  totalRoleCount: number;
  roleSearch: string;
  selectedRoleId: string;
  onRoleSearchChange: (value: string) => void;
  onSelectRole: (roleId: string) => void;
  onCreateRole: () => void;
};

export function RoleListSection({
  roles,
  totalRoleCount,
  roleSearch,
  selectedRoleId,
  onRoleSearchChange,
  onSelectRole,
  onCreateRole,
}: RoleListSectionProps) {
  const umRoleUpdate = useCapability(UM_ROLE_UPDATE);
  return (
    <UserManagementSectionCard
      title="Roles"
      description={
        umRoleUpdate
          ? 'Select a role to change it, or create a new one.'
          : 'Select a role to view its permissions.'
      }
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{roles.length} shown</Badge>
          <CapabilityGate capability={UM_ROLE_CREATE}>
            <Button type="button" size="sm" onClick={onCreateRole}>
              Create role
            </Button>
          </CapabilityGate>
        </div>
      }
      contentClassName="space-y-3"
    >
      <div className="space-y-2">
        <Label htmlFor="role-search">Search roles</Label>
        <Input
          id="role-search"
          placeholder="Search by name or description"
          value={roleSearch}
          onChange={(event) => onRoleSearchChange(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Showing {roles.length} of {totalRoleCount} roles.
        </p>
      </div>

      {roles.length > 0 ? (
        roles.map((role) => (
          <button
            key={role.id}
            type="button"
            className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${
              selectedRoleId === role.id ? 'border-primary bg-primary/5' : 'hover:border-foreground/30'
            }`}
            onClick={() => onSelectRole(role.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{role.display_name}</span>
              <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>
                {role.status}
              </Badge>
            </div>
            {role.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>
            ) : null}
          </button>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          {roleSearch.trim() === ''
            ? 'No roles have been set up yet.'
            : 'No roles match the current search.'}
        </p>
      )}
    </UserManagementSectionCard>
  );
}

export type CapabilityTreeNode =
  | {
      id: string;
      kind: 'branch';
      label: string;
      path: string[];
      children: CapabilityTreeNode[];
      capabilityIds: string[];
    }
  | {
      id: string;
      kind: 'capability';
      capability: Capability;
      capabilityIds: string[];
    };

type MutableCapabilityTreeBranch = {
  id: string;
  label: string;
  path: string[];
  children: Map<string, MutableCapabilityTreeBranch | CapabilityTreeNode>;
};

function getCapabilityModuleSegments(moduleId: string): string[] {
  const normalized = moduleId.trim();
  if (normalized === '') {
    return ['uncategorized'];
  }

  return normalized
    .split(/\/|::|>/g)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function createBranch(path: string[]): MutableCapabilityTreeBranch {
  return {
    id: `branch:${path.join('/')}`,
    label: path[path.length - 1] ?? 'module',
    path,
    children: new Map(),
  };
}

function finalizeCapabilityTree(branch: MutableCapabilityTreeBranch): CapabilityTreeNode[] {
  return Array.from(branch.children.values())
    .map((child): CapabilityTreeNode => {
      if (child.kind === 'capability') {
        return child;
      }

      const children = finalizeCapabilityTree(child);
      return {
        id: child.id,
        kind: 'branch',
        label: child.label,
        path: child.path,
        children,
        capabilityIds: children.flatMap((node) => node.capabilityIds),
      };
    })
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'branch' ? -1 : 1;
      }

      if (left.kind === 'branch' && right.kind === 'branch') {
        return left.label.localeCompare(right.label);
      }

      if (left.kind === 'capability' && right.kind === 'capability') {
        return left.capability.display_name.localeCompare(right.capability.display_name);
      }

      return 0;
    });
}

export function buildCapabilityTree(capabilities: Capability[]): CapabilityTreeNode[] {
  const root = createBranch([]);

  capabilities.forEach((capability) => {
    const segments = getCapabilityModuleSegments(capability.module);
    let currentBranch = root;

    segments.forEach((segment, index) => {
      const path = segments.slice(0, index + 1);
      const childKey = `branch:${path.join('/')}`;
      const existingChild = currentBranch.children.get(childKey);
      if (existingChild && existingChild.kind !== 'capability') {
        currentBranch = existingChild;
        return;
      }

      const nextBranch = createBranch(path);
      currentBranch.children.set(childKey, nextBranch);
      currentBranch = nextBranch;
    });

    currentBranch.children.set(`capability:${capability.id}`, {
      id: `capability:${capability.id}`,
      kind: 'capability',
      capability,
      capabilityIds: [capability.id],
    });
  });

  return finalizeCapabilityTree(root);
}

function getNodeCheckedState(
  node: CapabilityTreeNode,
  selectedCapabilityIds: Set<string>,
): boolean | 'indeterminate' {
  const selectedCount = node.capabilityIds.filter((capabilityId) =>
    selectedCapabilityIds.has(capabilityId),
  ).length;

  if (selectedCount === 0) {
    return false;
  }

  if (selectedCount === node.capabilityIds.length) {
    return true;
  }

  return 'indeterminate';
}

function formatModuleLabel(label: string): string {
  return label.replace(/[-_]/g, ' ');
}

export function treeBranchIds(nodes: CapabilityTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === 'branch' ? [node.id, ...treeBranchIds(node.children)] : [],
  );
}

export function CapabilityTreeNodeRow({
  node,
  depth,
  capabilitiesEditable,
  selectedCapabilityIds,
  expandedBranchIds,
  forceExpanded,
  onBranchToggle,
  onSetSelectedCapabilityIds,
  onToggleCapability,
  showCapabilityProvenance = false,
  plainLanguage = false,
  assignedCapabilityIds,
}: {
  node: CapabilityTreeNode;
  depth: number;
  capabilitiesEditable: boolean;
  showCapabilityProvenance?: boolean;
  plainLanguage?: boolean;
  selectedCapabilityIds: Set<string>;
  assignedCapabilityIds?: Set<string>;
  expandedBranchIds: Set<string>;
  forceExpanded: boolean;
  onBranchToggle: (nodeId: string) => void;
  onSetSelectedCapabilityIds: (capabilityIds: string[]) => void;
  onToggleCapability: (capabilityId: string) => void;
}) {
  if (node.kind === 'capability') {
    const capability = node.capability;
    const checked = selectedCapabilityIds.has(capability.id);
    const onRole = assignedCapabilityIds?.has(capability.id) ?? false;
    return (
      <div className="space-y-2" style={{ marginLeft: depth * 20 }}>
        <label
          className={`flex items-start gap-3 rounded-md border p-3 ${
            onRole ? 'border-primary/40 bg-primary/5' : ''
          }`}
        >
          <Checkbox
            checked={checked}
            disabled={!capabilitiesEditable}
            onCheckedChange={() => onToggleCapability(capability.id)}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{capability.display_name}</span>
              {onRole ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  On this role
                </Badge>
              ) : null}
            </div>
            {!plainLanguage ? (
              <>
                <code className="text-xs text-muted-foreground">{capability.capability_key}</code>
                <p className="mt-1 text-sm text-muted-foreground">
                  {capability.feature} / {capability.action}
                </p>
              </>
            ) : null}
            {capability.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{capability.description}</p>
            ) : null}
            {showCapabilityProvenance &&
            (capability.source_module_slug ||
              capability.source_permission_slug ||
              capability.source_catalog) ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Provenance:{' '}
                {[
                  capability.source_catalog,
                  capability.source_module_slug,
                  capability.source_permission_slug,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        </label>
      </div>
    );
  }

  const checkedState = getNodeCheckedState(node, selectedCapabilityIds);
  const expanded = forceExpanded || expandedBranchIds.has(node.id);
  const onRoleCount = assignedCapabilityIds
    ? node.capabilityIds.filter((capabilityId) => assignedCapabilityIds.has(capabilityId)).length
    : 0;

  const handleBranchCheckedChange = () => {
    const allSelected = node.capabilityIds.every((capabilityId) =>
      selectedCapabilityIds.has(capabilityId),
    );

    if (allSelected) {
      const branchCapabilityIds = new Set(node.capabilityIds);
      onSetSelectedCapabilityIds(
        Array.from(selectedCapabilityIds).filter((capabilityId) => !branchCapabilityIds.has(capabilityId)),
      );
      return;
    }

    onSetSelectedCapabilityIds(Array.from(new Set([...selectedCapabilityIds, ...node.capabilityIds])));
  };

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 rounded-md border px-3 py-2"
        style={{ marginLeft: depth * 20 }}
      >
        <button
          type="button"
          className="inline-flex size-5 items-center justify-center rounded-sm border bg-background"
          onClick={() => onBranchToggle(node.id)}
          aria-label={expanded ? 'Collapse module' : 'Expand module'}
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>

        <Checkbox
          checked={checkedState}
          disabled={!capabilitiesEditable || node.capabilityIds.length === 0}
          onCheckedChange={handleBranchCheckedChange}
        />

        <div className="min-w-0 flex-1">
          <div className="font-medium capitalize">{formatModuleLabel(node.label)}</div>
          <p className="text-xs text-muted-foreground">
            {node.capabilityIds.length}{' '}
            {plainLanguage ? 'permissions in this group' : 'capabilities in this branch'}
            {assignedCapabilityIds && onRoleCount > 0
              ? ` · ${onRoleCount} on this role`
              : null}
          </p>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-2">
          {node.children.map((child) => (
            <CapabilityTreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              capabilitiesEditable={capabilitiesEditable}
              selectedCapabilityIds={selectedCapabilityIds}
              assignedCapabilityIds={assignedCapabilityIds}
              expandedBranchIds={expandedBranchIds}
              forceExpanded={forceExpanded}
              onBranchToggle={onBranchToggle}
              onSetSelectedCapabilityIds={onSetSelectedCapabilityIds}
              onToggleCapability={onToggleCapability}
              showCapabilityProvenance={showCapabilityProvenance}
              plainLanguage={plainLanguage}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type RoleEditorDialogProps = {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  role: UmRole | null;
  roleType: string;
  code: string;
  displayName: string;
  description: string;
  selectedCapabilityIds: string[];
  /** Capability ids currently saved on the role (baseline). */
  assignedCapabilityIds: string[];
  assignedCount: number;
  visibleCount: number;
  totalCapabilityCount: number;
  isDirty: boolean;
  savePending: boolean;
  saveDisabled: boolean;
  assignedCapabilitiesPending: boolean;
  assignedCapabilitiesError: boolean;
  assignableCatalogPending: boolean;
  assignableCatalogError: boolean;
  capabilitySearch: string;
  capabilities: Capability[];
  onOpenChange: (open: boolean) => void;
  onRoleTypeChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCapabilitySearchChange: (value: string) => void;
  onSetSelectedCapabilityIds: (capabilityIds: string[]) => void;
  onToggleCapability: (capabilityId: string) => void;
  onRetryAssignableCatalog: () => void;
  onReset: () => void;
  onSave: () => void;
  /** When true, shows catalog provenance metadata on capability rows (admin operators). */
  showCapabilityProvenance?: boolean;
  /** When true, only product modules are shown in the permission tree (excludes platform modules). */
  productOnly?: boolean;
};

export function RoleEditorDialog({
  open,
  mode,
  role,
  roleType,
  code,
  displayName,
  description,
  selectedCapabilityIds,
  assignedCapabilityIds,
  assignedCount,
  visibleCount,
  totalCapabilityCount,
  isDirty,
  savePending,
  saveDisabled,
  assignedCapabilitiesPending,
  assignedCapabilitiesError,
  assignableCatalogPending,
  assignableCatalogError,
  capabilitySearch,
  capabilities,
  onOpenChange,
  onRoleTypeChange,
  onCodeChange,
  onDisplayNameChange,
  onDescriptionChange,
  onCapabilitySearchChange,
  onSetSelectedCapabilityIds,
  onToggleCapability,
  onRetryAssignableCatalog,
  onReset,
  onSave,
  showCapabilityProvenance = false,
  productOnly = false,
}: RoleEditorDialogProps) {
  const umRoleCreate = useCapability(UM_ROLE_CREATE);
  const umRoleUpdate = useCapability(UM_ROLE_UPDATE);
  const umCapabilityRead = useCapability(UM_CAPABILITY_READ);
  const { data: roleTypeOptions, isLoading: roleTypesLoading } = useRoleTypePicklistValues();
  const isCreate = mode === 'create';
  const isView = mode === 'view';
  const roleFormEditable = !isView && (isCreate ? umRoleCreate : umRoleUpdate);
  const capabilityTree = useMemo(() => buildCapabilityTree(capabilities), [capabilities]);
  const selectedCapabilityIdSet = useMemo(
    () => new Set(selectedCapabilityIds),
    [selectedCapabilityIds],
  );
  const assignedCapabilityIdSet = useMemo(
    () => new Set(assignedCapabilityIds),
    [assignedCapabilityIds],
  );
  /** Create-role uses the assignable catalog + accordion tree whenever capabilities can be loaded. */
  const showFullCatalog = umCapabilityRead || isCreate;
  const permissionsPending = showFullCatalog
    ? isCreate
      ? assignableCatalogPending
      : assignedCapabilitiesPending || assignableCatalogPending
    : assignedCapabilitiesPending;
  const permissionsError = showFullCatalog
    ? isCreate
      ? assignableCatalogError
      : assignedCapabilitiesError || assignableCatalogError
    : assignedCapabilitiesError;
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(new Set());
  const forceExpanded = capabilitySearch.trim() !== '';

  useEffect(() => {
    if (!open) {
      return;
    }

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
  }, [capabilityTree, open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <div className="shrink-0 space-y-2 border-b p-4 pb-3">
          <DialogHeader>
            <DialogTitle>
              {isCreate ? 'New role template' : isView ? 'View role' : 'Edit role'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-4 py-4 lg:flex-row lg:overflow-hidden lg:items-stretch">
            <section className="shrink-0 space-y-4 rounded-md border p-4 lg:w-[22rem] lg:max-h-full lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {!isCreate && role ? (
                    <>
                      <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>
                        {role.status}
                      </Badge>
                      {role.is_system ? <Badge variant="secondary">System role</Badge> : null}
                    </>
                  ) : (
                    <Badge variant="secondary">New Role Template</Badge>
                  )}
                  {isDirty ? <Badge variant="outline">Unsaved changes</Badge> : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-editor-type">Role type</Label>
                <Select
                  value={roleType || undefined}
                  onValueChange={(value) => {
                    onRoleTypeChange(value);
                    const match = roleTypeOptions?.find((opt) => opt.value === value);
                    if (match && isCreate) {
                      onDisplayNameChange(match.label);
                    }
                  }}
                  disabled={!roleFormEditable || roleTypesLoading}
                >
                  <SelectTrigger id="role-editor-type">
                    <SelectValue
                      placeholder={roleTypesLoading ? 'Loading…' : 'Select role type'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(roleTypeOptions ?? []).map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Role type can be shared by many templates. The short ID below must be unique per
                  tenant{isCreate ? '; it is suggested from the name' : ''}. Platform operators see
                  global types; hospital admins see clinical and staff types.
                </p>
              </div>


              <div className="space-y-2">
                <Label htmlFor="role-editor-name">Role name</Label>
                <Input
                  id="role-editor-name"
                  placeholder="Clinical administrator"
                  value={displayName}
                  disabled={!roleFormEditable}
                  onChange={(event) => onDisplayNameChange(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-editor-description">Description</Label>
                <Textarea
                  id="role-editor-description"
                  placeholder="Summarize who should receive this role."
                  value={description}
                  disabled={!roleFormEditable}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-editor-code">Short ID</Label>
                <Input
                  id="role-editor-code"
                  placeholder="e.g. clinical-admin"
                  value={code}
                  disabled={!roleFormEditable}
                  onChange={(event) => onCodeChange(event.target.value)}
                />
              </div>

              {!roleFormEditable ? (
                <p className="text-sm text-muted-foreground">
                  This editor is read-only for your account.
                </p>
              ) : null}
            </section>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden rounded-md border p-4">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-medium">Permissions</h4>
                  <p className="text-sm text-muted-foreground">
                    {showFullCatalog
                      ? isCreate
                        ? 'Expand a product and feature, then tick individual permissions for this role.'
                        : 'Expand modules to review permissions. Selected items are what this role will include.'
                      : 'Permissions saved on this role.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedCapabilityIds.length} selected</Badge>
                  {!isCreate ? (
                    <Badge variant="outline">{assignedCount} on this role</Badge>
                  ) : null}
                  {showFullCatalog ? (
                    <Badge variant="outline">{totalCapabilityCount} available</Badge>
                  ) : null}
                </div>
              </div>

              {!showFullCatalog && !isCreate && (isView || !umCapabilityRead) ? (
                assignedCapabilitiesPending ? (
                  <p className="text-sm text-muted-foreground">Loading permissions for this role...</p>
                ) : assignedCapabilitiesError ? (
                  <p className="text-sm text-destructive">
                    Could not load permissions for this role. Try again.
                  </p>
                ) : totalCapabilityCount === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This role has no permissions set up yet.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {capabilityTree.map((node) => (
                      <CapabilityTreeNodeRow
                        key={node.id}
                        node={node}
                        depth={0}
                        capabilitiesEditable={roleFormEditable}
                        selectedCapabilityIds={selectedCapabilityIdSet}
                        expandedBranchIds={expandedBranchIds}
                        forceExpanded={forceExpanded}
                        onBranchToggle={handleToggleBranch}
                        onSetSelectedCapabilityIds={onSetSelectedCapabilityIds}
                        onToggleCapability={onToggleCapability}
                        showCapabilityProvenance={showCapabilityProvenance}
                        plainLanguage
                        assignedCapabilityIds={undefined}
                      />
                    ))}
                  </div>
                )
              ) : permissionsPending ? (
                <p className="text-sm text-muted-foreground">Loading permissions...</p>
              ) : permissionsError ? (
                <div className="space-y-3 rounded-md border border-destructive/35 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">
                    Could not load the permission list. Check your connection and try again.
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={onRetryAssignableCatalog}>
                    Try again
                  </Button>
                </div>
              ) : totalCapabilityCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No permissions are available to assign for this organization yet.
                </p>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <div className="shrink-0 space-y-3 rounded-md border bg-muted/30 p-3">
                    <div className="space-y-2">
                      <Label htmlFor="role-editor-capability-search">Search permissions</Label>
                      <Input
                        id="role-editor-capability-search"
                        placeholder="Search by name or area"
                        value={capabilitySearch}
                        onChange={(event) => onCapabilitySearchChange(event.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        {visibleCount} permission{visibleCount === 1 ? '' : 's'} shown.
                      </p>
                      {roleFormEditable ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onSetSelectedCapabilityIds(capabilities.map((capability) => capability.id))
                            }
                          >
                            Select all shown
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onSetSelectedCapabilityIds([])}
                          >
                            Clear all
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {visibleCount === 0 ? (
                    <p className="shrink-0 text-sm text-muted-foreground">
                      No permissions match your search.
                    </p>
                  ) : (
                    <PermissionSelectionScrollRegion>
                      <MasterDataCapabilityPermissionTree
                        capabilities={capabilities}
                        selectedCapabilityIds={selectedCapabilityIds}
                        onSelectedCapabilityIdsChange={onSetSelectedCapabilityIds}
                        editable={roleFormEditable}
                        productOnly={productOnly}
                      />
                    </PermissionSelectionScrollRegion>
                  )}
                </div>
              )}
            </section>
        </div>

        <DialogFooter className="mx-0 mb-0 flex w-full shrink-0 items-center justify-end border-t px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isView ? 'Close' : 'Cancel'}
            </Button>
            {roleFormEditable ? (
              <>
                <Button type="button" variant="outline" disabled={!isDirty} onClick={onReset}>
                  Reset
                </Button>
                <Button type="button" disabled={saveDisabled} onClick={onSave}>
                  {savePending
                    ? isCreate
                      ? 'Creating...'
                      : 'Saving...'
                    : isCreate
                      ? 'Create role'
                      : 'Save changes'}
                </Button>
              </>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
