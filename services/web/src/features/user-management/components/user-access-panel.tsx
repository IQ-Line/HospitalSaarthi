import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ApiError } from '@/lib/api-client';
import {
  useApplyRoleTemplate,
  useDetachRoleTemplate,
  useReplaceUserCapabilities,
} from '../api/mutations';
import {
  roleCapabilitiesOptions,
  runtimeCapabilityCatalogOptions,
  roleListOptions,
  useUserCapabilities,
  useUserEffectiveCapabilities,
} from '../api/queries';
import type { AppliedRoleTemplate, Capability, UserCapabilityGrant } from '../types';
import { UserManagementSectionCard } from './user-management-section-card';
import {
  buildApplyRoleTemplateRequestBody,
  RoleTemplateCapabilityPicker,
} from './role-template-capability-picker';

type UserAccessPanelProps = {
  userId: string;
  sessionUserId: string | null;
  /** View assigned roles and capability grants on the user profile (needs `users.read`). */
  canViewUserAccess: boolean;
  canReadRoleTemplates: boolean;
  canReadCapabilities: boolean;
  canManageAccess: boolean;
};

function mutationErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body?.trim();
    if (body) {
      return body.length > 280 ? `${body.slice(0, 280)}...` : body;
    }
    return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'Request failed';
}

function CapabilityGrantList({
  title,
  description,
  grants,
}: {
  title: string;
  description: string;
  grants: UserCapabilityGrant[];
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {grants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No capabilities in this section yet.</p>
      ) : (
        <div className="space-y-3">
          {grants.map((grant) => (
            <div key={grant.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{grant.display_name}</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {grant.capability_key}
                </code>
                <Badge variant="outline">{grant.grant_source}</Badge>
                {grant.source_role_id ? (
                  <Badge variant="secondary">template copy</Badge>
                ) : null}
              </div>
              {grant.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{grant.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserAccessPanel({
  userId,
  sessionUserId,
  canViewUserAccess,
  canReadRoleTemplates,
  canReadCapabilities,
  canManageAccess,
}: UserAccessPanelProps) {
  if (!canViewUserAccess) {
    return null;
  }

  return (
    <UserAccessPanelContent
      userId={userId}
      sessionUserId={sessionUserId}
      canViewUserAccess={canViewUserAccess}
      canReadRoleTemplates={canReadRoleTemplates}
      canReadCapabilities={canReadCapabilities}
      canManageAccess={canManageAccess}
    />
  );
}

type UserAccessPanelContentProps = UserAccessPanelProps;

function UserAccessPanelContent({
  userId,
  sessionUserId,
  canViewUserAccess,
  canReadRoleTemplates,
  canReadCapabilities,
  canManageAccess,
}: UserAccessPanelContentProps) {
  const roleTemplatesQuery = useQuery({
    ...roleListOptions(),
    enabled: canReadRoleTemplates,
    staleTime: 30_000,
  });
  const capabilitiesCatalogQuery = useQuery({
    ...runtimeCapabilityCatalogOptions(),
    enabled: canReadCapabilities,
    staleTime: 30_000,
  });
  const capabilitiesSnapshotQuery = useUserCapabilities(userId, canViewUserAccess);
  const effectiveCapabilitiesQuery = useUserEffectiveCapabilities(userId, canViewUserAccess);

  const replaceCapabilities = useReplaceUserCapabilities(userId);
  const applyRoleTemplate = useApplyRoleTemplate(userId);
  const detachRoleTemplate = useDetachRoleTemplate(userId);

  const [selectedRoleTemplateId, setSelectedRoleTemplateId] = useState('');
  const [selectedRoleCapabilityIds, setSelectedRoleCapabilityIds] = useState<string[]>([]);
  const [manualCapabilityIds, setManualCapabilityIds] = useState<string[]>([]);
  const [detachCandidate, setDetachCandidate] = useState<AppliedRoleTemplate | null>(null);

  const handleRoleCapabilitySelectionChange = useCallback((capabilityIds: string[]) => {
    setSelectedRoleCapabilityIds(capabilityIds);
  }, []);

  useEffect(() => {
    setSelectedRoleCapabilityIds([]);
  }, [selectedRoleTemplateId]);

  useEffect(() => {
    const nextManualIds =
      capabilitiesSnapshotQuery.data?.direct_grants
        .filter((grant) => grant.grant_source === 'manual' || grant.grant_source === 'system')
        .map((grant) => grant.capability_id) ?? [];
    setManualCapabilityIds(nextManualIds);
  }, [capabilitiesSnapshotQuery.data]);

  const activeRoleTemplates = (roleTemplatesQuery.data ?? []).filter((role) => role.status === 'active');
  const appliedRoleTemplateIds = new Set(
    (capabilitiesSnapshotQuery.data?.role_templates ?? []).map((template) => template.role_id),
  );
  const availableRoleTemplates = activeRoleTemplates.filter((role) => !appliedRoleTemplateIds.has(role.id));
  const manualCapabilities = capabilitiesCatalogQuery.data ?? [];
  const copiedGrants = capabilitiesSnapshotQuery.data?.copied_grants ?? [];
  const directGrants = capabilitiesSnapshotQuery.data?.direct_grants ?? [];
  const isSelf = Boolean(sessionUserId && sessionUserId === userId);

  const effectiveCapabilityBadges = useMemo(() => {
    const keys = effectiveCapabilitiesQuery.data?.capability_keys ?? [];
    return [...keys].sort((left, right) => left.localeCompare(right));
  }, [effectiveCapabilitiesQuery.data]);

  const delegatedCapabilityBadges = useMemo(() => {
    const keys = effectiveCapabilitiesQuery.data?.delegated_capability_keys ?? [];
    return [...keys].sort((left, right) => left.localeCompare(right));
  }, [effectiveCapabilitiesQuery.data]);

  const handleToggleManualCapability = (capabilityId: string) => {
    setManualCapabilityIds((current) =>
      current.includes(capabilityId)
        ? current.filter((id) => id !== capabilityId)
        : [...current, capabilityId],
    );
  };

  const handleSaveCapabilities = () => {
    replaceCapabilities.mutate(
      { capability_ids: manualCapabilityIds },
      {
        onSuccess: () => {
          toast.success('Updated direct user capabilities');
        },
        onError: (error) => {
          toast.error(mutationErrorMessage(error));
        },
      },
    );
  };

  const roleCapabilitiesForApplyQuery = useQuery({
    ...roleCapabilitiesOptions(selectedRoleTemplateId),
    enabled: Boolean(selectedRoleTemplateId) && canReadCapabilities,
    staleTime: 30_000,
  });
  const allRoleCapabilityIds = useMemo(
    () => (roleCapabilitiesForApplyQuery.data ?? []).map((capability) => capability.id),
    [roleCapabilitiesForApplyQuery.data],
  );
  const roleCapabilitiesStillLoading =
    Boolean(selectedRoleTemplateId) &&
    canReadCapabilities &&
    (roleCapabilitiesForApplyQuery.isFetching || roleCapabilitiesForApplyQuery.data === undefined);

  const handleApplyRoleTemplate = () => {
    if (!selectedRoleTemplateId) return;
    if (allRoleCapabilityIds.length > 0 && selectedRoleCapabilityIds.length === 0) {
      toast.error('Select at least one capability from the role.');
      return;
    }
    applyRoleTemplate.mutate(
      buildApplyRoleTemplateRequestBody(
        selectedRoleTemplateId,
        selectedRoleCapabilityIds,
        allRoleCapabilityIds,
      ),
      {
        onSuccess: () => {
          toast.success('Applied role template');
          setSelectedRoleTemplateId('');
          setSelectedRoleCapabilityIds([]);
        },
        onError: (error) => {
          toast.error(mutationErrorMessage(error));
        },
      },
    );
  };

  const handleDetachRoleTemplate = () => {
    if (!detachCandidate) return;
    detachRoleTemplate.mutate(detachCandidate.role_id, {
      onSuccess: () => {
        toast.success(`Removed ${detachCandidate.role.display_name} and revoked its copied capabilities`);
        setDetachCandidate(null);
      },
      onError: (error) => {
        toast.error(mutationErrorMessage(error));
      },
    });
  };

  let roleTemplateContent: ReactNode = null;
  if (canViewUserAccess) {
    if (capabilitiesSnapshotQuery.isPending) {
      roleTemplateContent = <p className="text-sm text-muted-foreground">Loading applied templates...</p>;
    } else if (capabilitiesSnapshotQuery.isError) {
      roleTemplateContent = <p className="text-sm text-destructive">Unable to load applied templates right now.</p>;
    } else {
      const appliedTemplates = capabilitiesSnapshotQuery.data?.role_templates ?? [];
      roleTemplateContent = (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Applied role templates</p>
            <p className="text-xs text-muted-foreground">
              Templates are labels and copy actions only. Removing one does not revoke already copied capabilities.
            </p>
          </div>
          {appliedTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No role templates are currently applied.</p>
          ) : (
            <div className="space-y-3">
              {appliedTemplates.map((template) => (
                <div key={template.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{template.role.display_name}</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {template.role.code}
                      </code>
                    </div>
                    {template.role.description ? (
                      <p className="text-sm text-muted-foreground">{template.role.description}</p>
                    ) : null}
                  </div>
                  {canManageAccess ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetachCandidate(template)}
                      disabled={detachRoleTemplate.isPending}
                    >
                      Remove label
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {canManageAccess && canReadRoleTemplates ? (
            <div className="space-y-3">
              <Label htmlFor="apply-role-template">Apply another template</Label>
              <div className="flex max-w-md gap-2">
                <Select value={selectedRoleTemplateId} onValueChange={setSelectedRoleTemplateId}>
                  <SelectTrigger
                    id="apply-role-template"
                    className="flex-1"
                    disabled={availableRoleTemplates.length === 0 || roleTemplatesQuery.isPending}
                  >
                    <SelectValue
                      placeholder={
                        availableRoleTemplates.length === 0
                          ? 'No more active templates available'
                          : 'Select a template'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoleTemplates.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.display_name} ({role.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleApplyRoleTemplate}
                  disabled={
                    applyRoleTemplate.isPending ||
                    selectedRoleTemplateId.length === 0 ||
                    roleCapabilitiesStillLoading
                  }
                >
                  {applyRoleTemplate.isPending ? 'Applying...' : 'Apply'}
                </Button>
              </div>
              {selectedRoleTemplateId ? (
                <RoleTemplateCapabilityPicker
                  roleId={selectedRoleTemplateId}
                  canReadCapabilities={canReadCapabilities}
                  canManageAccess={canManageAccess}
                  selectedCapabilityIds={selectedRoleCapabilityIds}
                  onSelectedCapabilityIdsChange={handleRoleCapabilitySelectionChange}
                />
              ) : null}
              <p className="text-xs text-muted-foreground">
                Choose which capabilities to copy from the template. Re-applying the same template later
                synchronizes the role-scoped snapshot to your selection.
              </p>
            </div>
          ) : null}
        </div>
      );
    }
  }

  let directCapabilitiesContent: ReactNode = null;
  if (canReadCapabilities) {
    if (capabilitiesCatalogQuery.isPending || capabilitiesSnapshotQuery.isPending) {
      directCapabilitiesContent = <p className="text-sm text-muted-foreground">Loading direct capabilities...</p>;
    } else if (capabilitiesCatalogQuery.isError || capabilitiesSnapshotQuery.isError) {
      directCapabilitiesContent = <p className="text-sm text-destructive">Unable to load user capabilities right now.</p>;
    } else {
      directCapabilitiesContent = (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Direct user capabilities</p>
            <p className="text-xs text-muted-foreground">
              Manual grants are persisted directly on the user and refreshed for the current session when you edit your own access.
            </p>
          </div>
          <div className="space-y-3">
            {manualCapabilities.map((capability) => (
              <label key={capability.id} className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={manualCapabilityIds.includes(capability.id)}
                  disabled={!canManageAccess}
                  onCheckedChange={() => handleToggleManualCapability(capability.id)}
                />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{capability.display_name}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {capability.capability_key}
                    </code>
                  </div>
                  {capability.description ? (
                    <p className="text-sm text-muted-foreground">{capability.description}</p>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
          {canManageAccess ? (
            <div className="flex justify-end">
              <Button type="button" onClick={handleSaveCapabilities} disabled={replaceCapabilities.isPending}>
                {replaceCapabilities.isPending ? 'Saving...' : 'Save direct capabilities'}
              </Button>
            </div>
          ) : null}
        </div>
      );
    }
  }

  return (
    <>
      <UserManagementSectionCard
        title="Access management"
        description="Manage copied template access, direct user capabilities, and the effective capability snapshot used by the backend."
        contentClassName="space-y-4"
      >
        {isSelf ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            Self-access changes refresh the current principal snapshot and shell permission map automatically after a successful update.
          </div>
        ) : null}
        {roleTemplateContent}
        {directCapabilitiesContent}
        {canViewUserAccess ? (
          <CapabilityGrantList
            title="Copied capabilities"
            description="Capabilities copied from applied templates. These are persisted grants, not runtime inheritance."
            grants={copiedGrants}
          />
        ) : null}
        {canViewUserAccess ? (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Effective capabilities</p>
              <p className="text-xs text-muted-foreground">
                Effective access is resolved from persisted user capabilities plus delegated overlays.
              </p>
            </div>
            {effectiveCapabilitiesQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading effective capabilities...</p>
            ) : effectiveCapabilitiesQuery.isError ? (
              <p className="text-sm text-destructive">Unable to load effective capabilities right now.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {effectiveCapabilityBadges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No effective capabilities found.</p>
                  ) : (
                    effectiveCapabilityBadges.map((capabilityKey) => (
                      <Badge key={capabilityKey} variant="secondary">
                        {capabilityKey}
                      </Badge>
                    ))
                  )}
                </div>
                {delegatedCapabilityBadges.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Delegated overlays</p>
                    <div className="flex flex-wrap gap-2">
                      {delegatedCapabilityBadges.map((capabilityKey) => (
                        <Badge key={capabilityKey} variant="outline">
                          {capabilityKey}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        {canViewUserAccess ? (
          <CapabilityGrantList
            title="Persisted direct grants"
            description="This includes direct manual grants currently stored for the user."
            grants={directGrants}
          />
        ) : null}
      </UserManagementSectionCard>

      <ConfirmDialog
        open={detachCandidate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetachCandidate(null);
          }
        }}
        title="Remove applied template?"
        description={
          detachCandidate
            ? `This removes the ${detachCandidate.role.display_name} role template and revokes capabilities that were copied from it. Manual and delegated capabilities are not changed.`
            : 'Remove the selected applied template.'
        }
        confirmLabel={detachRoleTemplate.isPending ? 'Removing...' : 'Remove role template'}
        destructive
        onConfirm={handleDetachRoleTemplate}
      />
    </>
  );
}
