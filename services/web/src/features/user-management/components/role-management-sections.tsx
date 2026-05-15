import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
import { Textarea } from '@pulse/ui/textarea';
import type { Capability, UmRole } from '../types';
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
  canWriteRoles: boolean;
  onRoleSearchChange: (value: string) => void;
  onSelectRole: (roleId: string) => void;
  onCreateRole: () => void;
};

export function RoleListSection({
  roles,
  totalRoleCount,
  roleSearch,
  selectedRoleId,
  canWriteRoles,
  onRoleSearchChange,
  onSelectRole,
  onCreateRole,
}: RoleListSectionProps) {
  return (
    <UserManagementSectionCard
      title="Role templates"
      description="Click a template to edit it, or create a new one from the same flow."
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{roles.length} shown</Badge>
          {canWriteRoles ? (
            <Button type="button" size="sm" onClick={onCreateRole}>
              Create template
            </Button>
          ) : null}
        </div>
      }
      contentClassName="space-y-3"
    >
      <div className="space-y-2">
        <Label htmlFor="role-search">Search role templates</Label>
        <Input
          id="role-search"
          placeholder="Search name, code, description"
          value={roleSearch}
          onChange={(event) => onRoleSearchChange(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Showing {roles.length} of {totalRoleCount} role templates.
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
            <div className="mt-1 text-xs text-muted-foreground">{role.code}</div>
            {role.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>
            ) : null}
          </button>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          {roleSearch.trim() === ''
            ? 'No role templates have been created for this tenant yet.'
            : 'No role templates match the current search.'}
        </p>
      )}
    </UserManagementSectionCard>
  );
}

type CapabilityTreeNode =
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

function buildCapabilityTree(capabilities: Capability[]): CapabilityTreeNode[] {
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

function treeBranchIds(nodes: CapabilityTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === 'branch' ? [node.id, ...treeBranchIds(node.children)] : [],
  );
}

function CapabilityTreeNodeRow({
  node,
  depth,
  canWriteRoles,
  selectedCapabilityIds,
  expandedBranchIds,
  forceExpanded,
  onBranchToggle,
  onSetSelectedCapabilityIds,
  onToggleCapability,
}: {
  node: CapabilityTreeNode;
  depth: number;
  canWriteRoles: boolean;
  selectedCapabilityIds: Set<string>;
  expandedBranchIds: Set<string>;
  forceExpanded: boolean;
  onBranchToggle: (nodeId: string) => void;
  onSetSelectedCapabilityIds: (capabilityIds: string[]) => void;
  onToggleCapability: (capabilityId: string) => void;
}) {
  if (node.kind === 'capability') {
    const capability = node.capability;
    const checked = selectedCapabilityIds.has(capability.id);
    return (
      <div className="space-y-2" style={{ marginLeft: depth * 20 }}>
        <label className="flex items-start gap-3 rounded-md border p-3">
          <Checkbox
            checked={checked}
            disabled={!canWriteRoles}
            onCheckedChange={() => onToggleCapability(capability.id)}
          />
          <div className="min-w-0">
            <div className="font-medium">{capability.display_name}</div>
            <code className="text-xs text-muted-foreground">{capability.capability_key}</code>
            <p className="mt-1 text-sm text-muted-foreground">
              {capability.feature} / {capability.action}
            </p>
            {capability.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{capability.description}</p>
            ) : null}
          </div>
        </label>
      </div>
    );
  }

  const checkedState = getNodeCheckedState(node, selectedCapabilityIds);
  const expanded = forceExpanded || expandedBranchIds.has(node.id);

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
          disabled={!canWriteRoles || node.capabilityIds.length === 0}
          onCheckedChange={handleBranchCheckedChange}
        />

        <div className="min-w-0 flex-1">
          <div className="font-medium capitalize">{formatModuleLabel(node.label)}</div>
          <p className="text-xs text-muted-foreground">
            {node.capabilityIds.length} capabilities in this branch
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
              canWriteRoles={canWriteRoles}
              selectedCapabilityIds={selectedCapabilityIds}
              expandedBranchIds={expandedBranchIds}
              forceExpanded={forceExpanded}
              onBranchToggle={onBranchToggle}
              onSetSelectedCapabilityIds={onSetSelectedCapabilityIds}
              onToggleCapability={onToggleCapability}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type RoleEditorDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  role: UmRole | null;
  canWriteRoles: boolean;
  canReadCapabilities: boolean;
  code: string;
  displayName: string;
  description: string;
  selectedCapabilityIds: string[];
  assignedCount: number;
  visibleCount: number;
  totalCapabilityCount: number;
  isDirty: boolean;
  savePending: boolean;
  saveDisabled: boolean;
  deletePending: boolean;
  assignedCapabilitiesPending: boolean;
  assignedCapabilitiesError: boolean;
  capabilitySearch: string;
  capabilities: Capability[];
  onOpenChange: (open: boolean) => void;
  onCodeChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCapabilitySearchChange: (value: string) => void;
  onSetSelectedCapabilityIds: (capabilityIds: string[]) => void;
  onToggleCapability: (capabilityId: string) => void;
  onReset: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export function RoleEditorDialog({
  open,
  mode,
  role,
  canWriteRoles,
  canReadCapabilities,
  code,
  displayName,
  description,
  selectedCapabilityIds,
  assignedCount,
  visibleCount,
  totalCapabilityCount,
  isDirty,
  savePending,
  saveDisabled,
  deletePending,
  assignedCapabilitiesPending,
  assignedCapabilitiesError,
  capabilitySearch,
  capabilities,
  onOpenChange,
  onCodeChange,
  onDisplayNameChange,
  onDescriptionChange,
  onCapabilitySearchChange,
  onSetSelectedCapabilityIds,
  onToggleCapability,
  onReset,
  onSave,
  onDelete,
}: RoleEditorDialogProps) {
  const isCreate = mode === 'create';
  const capabilityTree = useMemo(() => buildCapabilityTree(capabilities), [capabilities]);
  const selectedCapabilityIdSet = useMemo(
    () => new Set(selectedCapabilityIds),
    [selectedCapabilityIds],
  );
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
            <DialogTitle>{isCreate ? 'Create role' : 'Edit role'}</DialogTitle>
            <DialogDescription>
              {isCreate
                ? 'Define the role metadata and select capabilities from the module catalog before saving.'
                : 'Update role details and adjust its capability mix from the same editor.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem),minmax(0,1fr)]">
            <section className="space-y-4 rounded-md border p-4">
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
                    <Badge variant="secondary">New role</Badge>
                  )}
                  {isDirty ? <Badge variant="outline">Unsaved changes</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Role code and display name are required. Capabilities can be selected by module on
                  the right.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-editor-code">Role code</Label>
                <Input
                  id="role-editor-code"
                  placeholder="clinical-admin"
                  value={code}
                  disabled={!canWriteRoles}
                  onChange={(event) => onCodeChange(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-editor-name">Display name</Label>
                <Input
                  id="role-editor-name"
                  placeholder="Clinical administrator"
                  value={displayName}
                  disabled={!canWriteRoles}
                  onChange={(event) => onDisplayNameChange(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-editor-description">Description</Label>
                <Textarea
                  id="role-editor-description"
                  placeholder="Summarize who should receive this role."
                  value={description}
                  disabled={!canWriteRoles}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                />
              </div>

              {!canWriteRoles ? (
                <p className="text-sm text-muted-foreground">
                  This editor is read-only for your account.
                </p>
              ) : null}
            </section>

            <section className="space-y-4 rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-medium">Capabilities</h4>
                  <p className="text-sm text-muted-foreground">
                    Build the role from module capabilities in the same save flow.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedCapabilityIds.length} selected</Badge>
                  {!isCreate ? <Badge variant="outline">{assignedCount} currently assigned</Badge> : null}
                </div>
              </div>

              {!canReadCapabilities ? (
                <p className="text-sm text-muted-foreground">
                  Your account cannot read the capability catalog, so capabilities cannot be reviewed
                  or edited here.
                </p>
              ) : assignedCapabilitiesPending ? (
                <p className="text-sm text-muted-foreground">Loading role capabilities...</p>
              ) : assignedCapabilitiesError ? (
                <p className="text-sm text-destructive">
                  Unable to load the current capabilities for this role.
                </p>
              ) : totalCapabilityCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No capabilities are available in the catalog yet.
                </p>
              ) : (
                <>
                  <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                    <div className="space-y-2">
                      <Label htmlFor="role-editor-capability-search">Search capabilities</Label>
                      <Input
                        id="role-editor-capability-search"
                        placeholder="Search module, capability key, feature, action"
                        value={capabilitySearch}
                        onChange={(event) => onCapabilitySearchChange(event.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        {visibleCount} visible capabilities in the current tree.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Module checkboxes select all nested capabilities. Future submodules will nest
                        under the same tree.
                      </p>
                    </div>
                  </div>

                  {capabilityTree.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No capabilities match the current search.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {capabilityTree.map((node) => (
                        <CapabilityTreeNodeRow
                          key={node.id}
                          node={node}
                          depth={0}
                          canWriteRoles={canWriteRoles}
                          selectedCapabilityIds={selectedCapabilityIdSet}
                          expandedBranchIds={expandedBranchIds}
                          forceExpanded={forceExpanded}
                          onBranchToggle={handleToggleBranch}
                          onSetSelectedCapabilityIds={onSetSelectedCapabilityIds}
                          onToggleCapability={onToggleCapability}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 flex w-full shrink-0 items-center justify-between border-t px-4 py-3">
          <div>
            {!isCreate && canWriteRoles ? (
              <Button
                type="button"
                variant="destructive"
                disabled={deletePending}
                onClick={onDelete}
              >
                {deletePending ? 'Deleting...' : 'Delete role'}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {canWriteRoles ? (
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
