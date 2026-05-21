import type { ReactNode } from 'react';
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
import { CapabilityGate } from '@/components/capability-gate';
import { useCapability } from '@/hooks/use-capability';
import { UM_ROLE_ASSIGN, UM_ROLE_READ } from '@/lib/runtime-capability-keys';
import type { Capability, UmRole } from '../types';
import { MasterDataCapabilityPermissionTree } from './master-data-capability-permission-tree';
import { UserManagementSectionCard } from './user-management-section-card';

export type CreateUserAccessOptions = {
  /** When true, exactly one role id is required to submit. */
  requireRoleTemplate: boolean;
};

export function buildCreateUserFormSchema(options: CreateUserAccessOptions) {
  return z.object({
    full_name: z.string().min(1, 'Required'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string(),
    username: z.string(),
    department: z.string(),
    clearance_tier_required: z.coerce.number().int().min(0).max(3),
    role_template_ids: options.requireRoleTemplate
      ? z.array(z.string().uuid()).length(1, 'Select a role.')
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

type CreateUserWorkplaceSectionProps = SharedFormSectionProps & {
  control: Control<CreateUserFormValues>;
};

/** Department and clearance — org/tenant come from Configurator (super-admin) or session tenant. */
export function CreateUserWorkplaceSection({
  register,
  errors,
  control,
}: CreateUserWorkplaceSectionProps) {
  return (
    <UserManagementSectionCard
      title="Workplace details"
      description="Department and access level for this user."
      contentClassName="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
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
  roleTemplates,
  roleTemplatesPending,
  roleTemplatesError,
  roleCapabilities,
  roleCapabilitiesPending,
  roleCapabilitiesError,
  control,
  errors,
}: CreateUserAccessSectionProps) {
  const umRoleRead = useCapability(UM_ROLE_READ);
  const umRoleAssign = useCapability(UM_ROLE_ASSIGN);

  let roleBlock: ReactNode;
  if (!umRoleRead) {
    roleBlock = (
      <p className="text-sm text-muted-foreground">
        You can create the user, but you do not have permission to review roles.
      </p>
    );
  } else if (roleTemplatesPending) {
    roleBlock = <p className="text-sm text-muted-foreground">Loading roles...</p>;
  } else if (roleTemplatesError) {
    roleBlock = <p className="text-sm text-destructive">Unable to load roles right now.</p>;
  } else if (roleTemplates.length === 0) {
    roleBlock = (
      <p className="text-sm text-muted-foreground">No active roles are available yet.</p>
    );
  } else {
    roleBlock = (
      <div className="space-y-2">
        <Label htmlFor="c_role_template">
          {umRoleAssign ? 'Role (required)' : 'Role'}
        </Label>
        <Controller
          control={control}
          name="role_template_ids"
          render={({ field }) => {
            const selectedId = field.value[0] ?? roleTemplates[0]?.id ?? '';
            return (
              <Select
                disabled={!umRoleAssign}
                value={selectedId}
                onValueChange={(value) => {
                  field.onChange([value]);
                }}
              >
                <SelectTrigger id="c_role_template">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleTemplates.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
        <p className="text-xs text-muted-foreground">
          {umRoleAssign
            ? 'Choose a role, then tick the permissions they should have.'
            : 'You can review the role but cannot change it.'}
        </p>
      </div>
    );
  }

  let treeBlock: ReactNode;
  if (!umRoleRead) {
    treeBlock = (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view this role&apos;s permissions.
      </p>
    );
  } else if (roleCapabilitiesPending) {
    treeBlock = <p className="text-sm text-muted-foreground">Loading permissions...</p>;
  } else if (roleCapabilitiesError) {
    treeBlock = <p className="text-sm text-destructive">Could not load permissions for this role.</p>;
  } else if (roleCapabilities.length === 0) {
    treeBlock = (
      <p className="text-sm text-muted-foreground">
        This role has no permissions set up yet, or no role is selected.
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
                <CapabilityGate capability={UM_ROLE_ASSIGN}>
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
                </CapabilityGate>
              </div>
              <MasterDataCapabilityPermissionTree
                capabilities={roleCapabilities}
                selectedCapabilityIds={field.value}
                onSelectedCapabilityIdsChange={field.onChange}
                editable={umRoleAssign}
              />
            </div>
          );
        }}
      />
    );
  }

  return (
    <UserManagementSectionCard
      title="Role & permissions"
      description="Pick a role and choose what this person is allowed to do."
      contentClassName="space-y-4"
    >
      {roleBlock}
      {treeBlock}
      <FieldError message={errors.role_template_ids?.message?.toString()} />
      <FieldError message={errors.role_capability_selection_ids?.message?.toString()} />
    </UserManagementSectionCard>
  );
}
