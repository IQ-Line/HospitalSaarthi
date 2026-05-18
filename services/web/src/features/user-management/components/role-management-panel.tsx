import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import type { Capability } from '../types';
import {
  useCreateRole,
  useDeleteRole,
  useReplaceRoleCapabilities,
  useUpdateRole,
} from '../api/mutations';
import { capabilityListOptions, useRoleCapabilities, useRolesSuspense } from '../api/queries';

type RoleManagementPanelProps = {
  canWriteRoles: boolean;
  canReadCapabilities: boolean;
};

function groupCapabilitiesByModule(capabilities: Capability[]): Record<string, Capability[]> {
  return capabilities.reduce<Record<string, Capability[]>>((acc, capability) => {
    const current = acc[capability.module] ?? [];
    acc[capability.module] = [...current, capability];
    return acc;
  }, {});
}

function buildAssignedCapabilitiesContent(
  roleCapabilitiesQuery: UseQueryResult<Capability[], Error>,
): ReactNode {
  if (roleCapabilitiesQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading assigned capabilities...</p>;
  }

  if (roleCapabilitiesQuery.isError) {
    return <p className="text-sm text-destructive">Unable to load capabilities for this role.</p>;
  }

  if (roleCapabilitiesQuery.data && roleCapabilitiesQuery.data.length > 0) {
    return (
      <div className="flex flex-wrap gap-2">
        {roleCapabilitiesQuery.data.map((capability) => (
          <div key={capability.id} className="rounded-md border px-2 py-1">
            <div className="text-sm font-medium">{capability.display_name}</div>
            <code className="text-xs text-muted-foreground">{capability.capability_key}</code>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">This role currently has no capabilities assigned.</p>;
}

type CapabilityCatalogSectionProps = {
  capabilitiesByModule: Record<string, Capability[]>;
  canWriteRoles: boolean;
  selectedCapabilityIds: string[];
  onToggleCapability: (capabilityId: string, checked: boolean) => void;
};

function CapabilityCatalogSection({
  capabilitiesByModule,
  canWriteRoles,
  selectedCapabilityIds,
  onToggleCapability,
}: CapabilityCatalogSectionProps) {
  return Object.entries(capabilitiesByModule).map(([moduleId, moduleCapabilities]) => (
    <div key={moduleId} className="space-y-2">
      <p className="text-sm font-medium capitalize">{moduleId.replace(/-/g, ' ')}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {moduleCapabilities.map((capability) => {
          const checked = selectedCapabilityIds.includes(capability.id);
          return (
            <label key={capability.id} className="flex items-start gap-2 rounded-md border p-2">
              <input
                type="checkbox"
                checked={checked}
                disabled={!canWriteRoles}
                onChange={(e) => onToggleCapability(capability.id, e.target.checked)}
              />
              <span className="text-sm">
                <span className="block font-medium">{capability.display_name}</span>
                <code className="text-xs text-muted-foreground">{capability.capability_key}</code>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  ));
}

export function RoleManagementPanel({
  canWriteRoles,
  canReadCapabilities,
}: RoleManagementPanelProps) {
  const { data: roles } = useRolesSuspense();
  const capabilitiesQuery = useQuery({
    ...capabilityListOptions(),
    enabled: canReadCapabilities,
  });
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<string[]>([]);

  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;
  const roleCapabilitiesQuery = useRoleCapabilities(selectedRoleId, selectedRole !== null);
  const updateRole = useUpdateRole(selectedRoleId);
  const replaceRoleCapabilities = useReplaceRoleCapabilities(selectedRoleId);

  useEffect(() => {
    const [firstRole] = roles;
    if (!selectedRole && firstRole) {
      setSelectedRoleId(firstRole.id);
    }
  }, [roles, selectedRole]);

  useEffect(() => {
    if (!selectedRole) {
      setEditCode('');
      setEditDisplayName('');
      setEditDescription('');
      return;
    }
    setEditCode(selectedRole.code);
    setEditDisplayName(selectedRole.display_name);
    setEditDescription(selectedRole.description ?? '');
  }, [selectedRole]);

  useEffect(() => {
    if (!roleCapabilitiesQuery.data) return;
    setSelectedCapabilityIds(roleCapabilitiesQuery.data.map((capability) => capability.id));
  }, [roleCapabilitiesQuery.data]);

  const editableCapabilities = capabilitiesQuery.data ?? [];
  const capabilitiesByModule = useMemo(
    () => groupCapabilitiesByModule(editableCapabilities),
    [editableCapabilities],
  );
  const assignedCapabilitiesContent = buildAssignedCapabilitiesContent(roleCapabilitiesQuery);

  const handleCreateCodeChange = (e: ChangeEvent<HTMLInputElement>) => setCreateCode(e.target.value);
  const handleCreateDisplayNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setCreateDisplayName(e.target.value);
  const handleCreateDescriptionChange = (e: ChangeEvent<HTMLInputElement>) =>
    setCreateDescription(e.target.value);
  const handleEditCodeChange = (e: ChangeEvent<HTMLInputElement>) => setEditCode(e.target.value);
  const handleEditDisplayNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setEditDisplayName(e.target.value);
  const handleEditDescriptionChange = (e: ChangeEvent<HTMLInputElement>) =>
    setEditDescription(e.target.value);
  const handleToggleCapability = (capabilityId: string, checked: boolean) => {
    setSelectedCapabilityIds((current) =>
      checked
        ? [...new Set([...current, capabilityId])]
        : current.filter((item) => item !== capabilityId),
    );
  };

  return (
    <section className="rounded-lg border p-4 space-y-6">
      <div>
        <h3 className="text-lg font-medium">Role administration</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage tenant roles as flat containers of canonical capabilities.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem,1fr]">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Roles</p>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={`w-full rounded-md border px-3 py-2 text-left ${
                    selectedRoleId === role.id ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{role.display_name}</span>
                    <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>
                      {role.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{role.code}</div>
                </button>
              ))}
            </div>
          </div>

          {canWriteRoles && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">Create role</p>
              <Input placeholder="role code" value={createCode} onChange={handleCreateCodeChange} />
              <Input
                placeholder="display name"
                value={createDisplayName}
                onChange={handleCreateDisplayNameChange}
              />
              <Input
                placeholder="description"
                value={createDescription}
                onChange={handleCreateDescriptionChange}
              />
              <Button
                type="button"
                disabled={createRole.isPending}
                onClick={() =>
                  createRole.mutate(
                    {
                      code: createCode,
                      display_name: createDisplayName,
                      description: createDescription === '' ? null : createDescription,
                    },
                    {
                      onSuccess: (role) => {
                        setSelectedRoleId(role.id);
                        setCreateCode('');
                        setCreateDisplayName('');
                        setCreateDescription('');
                      },
                    },
                  )
                }
              >
                Create role
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {selectedRole ? (
            <>
              <div className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Role details</p>
                  {canWriteRoles ? (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleteRole.isPending}
                      onClick={() =>
                        deleteRole.mutate(selectedRole.id, {
                          onSuccess: () => setSelectedRoleId(''),
                        })
                      }
                    >
                      Delete role
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role-code">Code</Label>
                    <Input id="role-code" value={editCode} onChange={handleEditCodeChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-display-name">Display name</Label>
                    <Input
                      id="role-display-name"
                      value={editDisplayName}
                      onChange={handleEditDisplayNameChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-description">Description</Label>
                  <Input
                    id="role-description"
                    value={editDescription}
                    onChange={handleEditDescriptionChange}
                  />
                </div>

                {canWriteRoles ? (
                  <Button
                    type="button"
                    disabled={updateRole.isPending}
                    onClick={() =>
                      updateRole.mutate({
                        code: editCode,
                        display_name: editDisplayName,
                        description: editDescription === '' ? null : editDescription,
                      })
                    }
                  >
                    Save role
                  </Button>
                ) : null}
              </div>

              <div className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Capability composition</p>
                  {canWriteRoles && canReadCapabilities ? (
                    <Button
                      type="button"
                      disabled={replaceRoleCapabilities.isPending}
                      onClick={() =>
                        replaceRoleCapabilities.mutate({ capability_ids: selectedCapabilityIds })
                      }
                    >
                      Save capabilities
                    </Button>
                  ) : null}
                </div>
                {canReadCapabilities ? (
                  <CapabilityCatalogSection
                    capabilitiesByModule={capabilitiesByModule}
                    canWriteRoles={canWriteRoles}
                    selectedCapabilityIds={selectedCapabilityIds}
                    onToggleCapability={handleToggleCapability}
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Your account can read roles, but it cannot read the full capability catalog.
                      Showing the currently assigned capabilities only.
                    </p>
                    {assignedCapabilitiesContent}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Create or select a role to manage.</p>
          )}
        </div>
      </div>
    </section>
  );
}
