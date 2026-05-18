import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import type { Capability, UmRole } from '../types';
import {
  buildCapabilityTree,
  CapabilityTreeNodeRow,
  treeBranchIds,
} from './role-management-sections';
import { UserManagementSectionCard } from './user-management-section-card';

export type CreateUserAccessOptions = {
  /** When true, exactly one role template id is required to submit. */
  requireRoleTemplate: boolean;
};

export function buildCreateUserFormSchema(options: CreateUserAccessOptions) {
  return z.object({
    full_name: z.string().min(1, 'Required'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string(),
    username: z.string(),
    org_id: z.union([z.literal(''), z.string().uuid()]),
    department: z.string(),
    clearance_tier_required: z.coerce.number().int().min(0).max(3),
    role_template_ids: options.requireRoleTemplate
      ? z.array(z.string().uuid()).length(1, 'Select a role template.')
      : z.array(z.string().uuid()).max(1).default([]),
    role_capability_selection_ids: z.array(z.string().uuid()).default([]),
  });
}

export type CreateUserFormValues = z.infer<ReturnType<typeof buildCreateUserFormSchema>>;

type SharedFormSectionProps = {
  register: UseFormRegister<CreateUserFormValues>;
  errors: FieldErrors<CreateUserFormValues>;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function CreateUserIdentitySection({ register, errors }: SharedFormSectionProps) {
  return (
    <UserManagementSectionCard
      title="Basic details"
      description="Enter the user's name and sign-in details."
      contentClassName="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="c_full_name">Full name</Label>
          <Input id="c_full_name" {...register('full_name')} />
          <FieldError message={errors.full_name?.message?.toString()} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_email">Email</Label>
          <Input id="c_email" type="email" autoComplete="email" {...register('email')} />
          <p className="text-xs text-muted-foreground">
            The user will sign in with this email address.
          </p>
          <FieldError message={errors.email?.message?.toString()} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_password">Password</Label>
          <Input
            id="c_password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          <FieldError message={errors.password?.message?.toString()} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_phone">Phone</Label>
          <Input id="c_phone" {...register('phone')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_username">Username</Label>
          <Input id="c_username" {...register('username')} />
        </div>
      </div>
    </UserManagementSectionCard>
  );
}

type CreateUserOrganizationSectionProps = SharedFormSectionProps & {
  control: Control<CreateUserFormValues>;
};

export function CreateUserOrganizationSection({
  register,
  errors,
  control,
}: CreateUserOrganizationSectionProps) {
  return (
    <UserManagementSectionCard
      title="Organization"
      description="Add the organization and department details for this user."
      contentClassName="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="c_org_id">Organization ID</Label>
          <Input id="c_org_id" {...register('org_id')} />
          <FieldError message={errors.org_id?.message?.toString()} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_department">Department</Label>
          <Input id="c_department" {...register('department')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_clearance">Access level</Label>
          <Controller
            control={control}
            name="clearance_tier_required"
            render={({ field }) => (
              <Select
                value={String(field.value ?? 0)}
                onValueChange={(value: string) => field.onChange(Number(value))}
              >
                <SelectTrigger id="c_clearance">
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Level 0</SelectItem>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Higher levels can be used for more sensitive work.
          </p>
          <FieldError message={errors.clearance_tier_required?.message?.toString()} />
        </div>
      </div>
    </UserManagementSectionCard>
  );
}

type CreateUserAccessSectionProps = {
  canReadRoleTemplates: boolean;
  canReadCapabilities: boolean;
  canManageAccess: boolean;
  roleTemplates: UmRole[];
  roleTemplatesPending: boolean;
  roleTemplatesError: boolean;
  roleCapabilities: Capability[];
  roleCapabilitiesPending: boolean;
  roleCapabilitiesError: boolean;
  control: Control<CreateUserFormValues>;
  errors: FieldErrors<CreateUserFormValues>;
};

export function CreateUserAccessSection({
  canReadRoleTemplates,
  canReadCapabilities,
  canManageAccess,
  roleTemplates,
  roleTemplatesPending,
  roleTemplatesError,
  roleCapabilities,
  roleCapabilitiesPending,
  roleCapabilitiesError,
  control,
  errors,
}: CreateUserAccessSectionProps) {
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(new Set());

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

  let roleBlock: ReactNode;
  if (!canReadRoleTemplates) {
    roleBlock = (
      <p className="text-sm text-muted-foreground">
        You can create the user, but you do not have permission to review role templates.
      </p>
    );
  } else if (roleTemplatesPending) {
    roleBlock = <p className="text-sm text-muted-foreground">Loading role templates...</p>;
  } else if (roleTemplatesError) {
    roleBlock = <p className="text-sm text-destructive">Unable to load role templates right now.</p>;
  } else if (roleTemplates.length === 0) {
    roleBlock = (
      <p className="text-sm text-muted-foreground">No active role templates are available yet.</p>
    );
  } else {
    roleBlock = (
      <div className="space-y-2">
        <Label htmlFor="c_role_template">
          {canManageAccess ? 'Role template (required)' : 'Role template'}
        </Label>
        <Controller
          control={control}
          name="role_template_ids"
          render={({ field }) => {
            const selectedId = field.value[0] ?? roleTemplates[0]?.id ?? '';
            return (
              <Select
                disabled={!canManageAccess}
                value={selectedId}
                onValueChange={(value) => {
                  field.onChange([value]);
                }}
              >
                <SelectTrigger id="c_role_template">
                  <SelectValue placeholder="Select a role template" />
                </SelectTrigger>
                <SelectContent>
                  {roleTemplates.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {`${role.display_name} (${role.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
        <p className="text-xs text-muted-foreground">
          {canManageAccess
            ? 'A role template is required. Then choose which of its capabilities this user receives; module rows support select-all for their subtree.'
            : 'Role assignment is shown for your review only.'}
        </p>
      </div>
    );
  }

  let treeBlock: ReactNode;
  if (!canReadCapabilities) {
    treeBlock = (
      <p className="text-sm text-muted-foreground">
        Capability visibility is required to pick capabilities from a role template.
      </p>
    );
  } else if (roleCapabilitiesPending) {
    treeBlock = <p className="text-sm text-muted-foreground">Loading role capabilities...</p>;
  } else if (roleCapabilitiesError) {
    treeBlock = <p className="text-sm text-destructive">Unable to load capabilities for this role.</p>;
  } else if (roleCapabilities.length === 0) {
    treeBlock = (
      <p className="text-sm text-muted-foreground">
        This role has no capabilities yet, or no role is selected.
      </p>
    );
  } else {
    treeBlock = (
      <Controller
        control={control}
        name="role_capability_selection_ids"
        render={({ field }) => {
          const selectedSet = new Set(field.value);
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary">{field.value.length} selected</Badge>
                {canManageAccess ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const all = roleCapabilities.map((c) => c.id);
                        field.onChange(all);
                      }}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        field.onChange([]);
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
                    onSetSelectedCapabilityIds={(ids) => {
                      field.onChange(ids);
                    }}
                    onToggleCapability={(capabilityId) => {
                      const next = field.value.includes(capabilityId)
                        ? field.value.filter((id) => id !== capabilityId)
                        : [...field.value, capabilityId];
                      field.onChange(next);
                    }}
                  />
                ))}
              </div>
            </div>
          );
        }}
      />
    );
  }

  return (
    <UserManagementSectionCard
      title="Access setup"
      description="Assign a role template (required when you can manage access) and choose which of its capabilities the new user receives."
      contentClassName="space-y-4"
    >
      {roleBlock}
      {treeBlock}
      <FieldError message={errors.role_template_ids?.message?.toString()} />
      <FieldError message={errors.role_capability_selection_ids?.message?.toString()} />
    </UserManagementSectionCard>
  );
}
