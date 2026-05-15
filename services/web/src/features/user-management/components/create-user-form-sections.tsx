import type { ReactNode } from 'react';
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { z } from 'zod';
import { Checkbox } from '@pulse/ui/checkbox';
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
import { UserManagementSectionCard } from './user-management-section-card';

export const createUserFormSchema = z.object({
  full_name: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string(),
  username: z.string(),
  org_id: z.union([z.literal(''), z.string().uuid()]),
  department: z.string(),
  clearance_tier_required: z.coerce.number().int().min(0).max(3),
  role_template_ids: z.array(z.string().uuid()).default([]),
  capability_ids: z.array(z.string().uuid()).default([]),
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

type SharedFormSectionProps = {
  register: UseFormRegister<CreateUserFormValues>;
  errors: FieldErrors<CreateUserFormValues>;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function CreateUserIdentitySection({
  register,
  errors,
}: SharedFormSectionProps) {
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

type CapabilityChecklistProps = {
  title: string;
  description: string;
  capabilities: Capability[];
  selectedCapabilityIds: string[];
  canEdit: boolean;
  emptyMessage: string;
  onToggleCapability?: (capabilityId: string) => void;
};

function CapabilityChecklist({
  title,
  description,
  capabilities,
  selectedCapabilityIds,
  canEdit,
  emptyMessage,
  onToggleCapability,
}: CapabilityChecklistProps) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {capabilities.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {capabilities.map((capability) => {
            const selected = selectedCapabilityIds.includes(capability.id);
            return (
              <label
                key={capability.id}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors"
              >
                {canEdit ? (
                  <Checkbox
                    checked={selected}
                    disabled={!canEdit}
                    onCheckedChange={() => onToggleCapability?.(capability.id)}
                  />
                ) : (
                  <div className="mt-1 size-2.5 shrink-0 rounded-full bg-primary/70" />
                )}
                <div className="min-w-0 space-y-1">
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
            );
          })}
        </div>
      )}
    </div>
  );
}

type CreateUserAccessSectionProps = {
  canReadRoleTemplates: boolean;
  canReadCapabilities: boolean;
  canManageAccess: boolean;
  roleTemplates: UmRole[];
  roleTemplatesPending: boolean;
  roleTemplatesError: boolean;
  capabilities: Capability[];
  capabilitiesPending: boolean;
  capabilitiesError: boolean;
  selectedRoleTemplateIds: string[];
  selectedCapabilityIds: string[];
  copiedCapabilities: Capability[];
  effectiveCapabilities: Capability[];
  onToggleRoleTemplate: (roleId: string) => void;
  onToggleCapability: (capabilityId: string) => void;
  control: Control<CreateUserFormValues>;
};

function RoleTemplatePicker({
  canManageAccess,
  roleTemplates,
  selectedRoleTemplateIds,
  onToggleRoleTemplate,
}: {
  canManageAccess: boolean;
  roleTemplates: UmRole[];
  selectedRoleTemplateIds: string[];
  onToggleRoleTemplate: (roleId: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Apply role template</p>
        <p className="text-xs text-muted-foreground">
          Applying a template copies its current capabilities to the user at create time.
        </p>
      </div>
      <div className="space-y-3">
        {roleTemplates.map((role) => {
          const selected = selectedRoleTemplateIds.includes(role.id);
          return (
            <label key={role.id} className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                checked={selected}
                disabled={!canManageAccess}
                onCheckedChange={() => onToggleRoleTemplate(role.id)}
              />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{role.display_name}</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {role.code}
                  </code>
                </div>
                {role.description ? (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function CreateUserAccessSection({
  canReadRoleTemplates,
  canReadCapabilities,
  canManageAccess,
  roleTemplates,
  roleTemplatesPending,
  roleTemplatesError,
  capabilities,
  capabilitiesPending,
  capabilitiesError,
  selectedRoleTemplateIds,
  selectedCapabilityIds,
  copiedCapabilities,
  effectiveCapabilities,
  onToggleRoleTemplate,
  onToggleCapability,
}: CreateUserAccessSectionProps) {
  let roleTemplateContent: ReactNode;
  if (!canReadRoleTemplates) {
    roleTemplateContent = (
      <p className="text-sm text-muted-foreground">
        You can create the user, but you do not have permission to review role templates.
      </p>
    );
  } else if (roleTemplatesPending) {
    roleTemplateContent = <p className="text-sm text-muted-foreground">Loading role templates...</p>;
  } else if (roleTemplatesError) {
    roleTemplateContent = <p className="text-sm text-destructive">Unable to load role templates right now.</p>;
  } else if (roleTemplates.length === 0) {
    roleTemplateContent = (
      <p className="text-sm text-muted-foreground">
        No active role templates are available yet.
      </p>
    );
  } else {
    roleTemplateContent = (
      <RoleTemplatePicker
        canManageAccess={canManageAccess}
        roleTemplates={roleTemplates}
        selectedRoleTemplateIds={selectedRoleTemplateIds}
        onToggleRoleTemplate={onToggleRoleTemplate}
      />
    );
  }

  let directCapabilityContent: ReactNode;
  if (!canReadCapabilities) {
    directCapabilityContent = (
      <p className="text-sm text-muted-foreground">
        Capability visibility is required to review or edit direct user access.
      </p>
    );
  } else if (capabilitiesPending) {
    directCapabilityContent = <p className="text-sm text-muted-foreground">Loading capabilities...</p>;
  } else if (capabilitiesError) {
    directCapabilityContent = <p className="text-sm text-destructive">Unable to load capabilities right now.</p>;
  } else {
    directCapabilityContent = (
      <CapabilityChecklist
        title="Direct user capabilities"
        description="These manual grants are written directly to the user and stay independent from later template edits."
        capabilities={capabilities}
        selectedCapabilityIds={selectedCapabilityIds}
        canEdit={canManageAccess}
        emptyMessage="No capabilities are available."
        onToggleCapability={onToggleCapability}
      />
    );
  }

  return (
    <UserManagementSectionCard
      title="Access setup"
      description="Choose optional role templates, direct capabilities, and review the effective access that will be created."
      contentClassName="space-y-4"
    >
      {roleTemplateContent}
      {directCapabilityContent}
      <CapabilityChecklist
        title="Copied capabilities"
        description="Preview of capabilities copied from the selected role templates."
        capabilities={copiedCapabilities}
        selectedCapabilityIds={copiedCapabilities.map((capability) => capability.id)}
        canEdit={false}
        emptyMessage="Select one or more role templates to preview copied capabilities."
      />
      <CapabilityChecklist
        title="Effective capabilities"
        description="The combined capability set the user will receive immediately after creation."
        capabilities={effectiveCapabilities}
        selectedCapabilityIds={effectiveCapabilities.map((capability) => capability.id)}
        canEdit={false}
        emptyMessage="No effective capabilities are selected yet."
      />
    </UserManagementSectionCard>
  );
}
