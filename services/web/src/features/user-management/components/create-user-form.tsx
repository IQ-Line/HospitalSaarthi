import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import type { CreateUserBody } from '../types';
import { useCreateUser } from '../api/mutations';
import { roleCapabilitiesOptions, roleListOptions } from '../api/queries';

const schema = z.object({
  full_name: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string(),
  username: z.string(),
  org_id: z.union([z.literal(''), z.string().uuid()]),
  department: z.string(),
  clearance_tier_required: z.coerce.number().int().min(0).max(3),
  role_ids: z.array(z.string().uuid()).default([]),
});

type FormValues = z.infer<typeof schema>;

function toBody(values: FormValues, canAssignRoles: boolean): CreateUserBody {
  return {
    full_name: values.full_name,
    email: values.email.trim(),
    password: values.password,
    phone: values.phone === '' ? null : values.phone,
    username: values.username === '' ? null : values.username,
    org_id: values.org_id === '' ? null : values.org_id,
    department: values.department === '' ? null : values.department,
    clearance_tier_required: values.clearance_tier_required,
    role_ids: canAssignRoles ? values.role_ids : [],
  };
}

type CreateUserFormProps = {
  canReadRoles: boolean;
  canAssignRoles: boolean;
};

export function CreateUserForm({ canReadRoles, canAssignRoles }: CreateUserFormProps) {
  const navigate = useNavigate();
  const create = useCreateUser();
  const rolesQuery = useQuery({
    ...roleListOptions(),
    enabled: canReadRoles,
    staleTime: 30_000,
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      phone: '',
      username: '',
      org_id: '',
      department: '',
      clearance_tier_required: 0,
      role_ids: [],
    },
  });
  const selectedRoleIds = form.watch('role_ids');
  const availableRoles = (rolesQuery.data ?? []).filter((role) => role.status === 'active');
  const roleCapabilityQueries = useQueries({
    queries: (canReadRoles ? availableRoles : []).map((role) => ({
      ...roleCapabilitiesOptions(role.id),
      enabled: canReadRoles && rolesQuery.isSuccess,
      staleTime: 30_000,
    })),
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(toBody(values, canAssignRoles), {
      onSuccess: (user) => {
        void navigate({
          to: '/user-management/$userId',
          params: { userId: user.id },
        });
      },
    });
  });

  const toggleRole = (roleId: string) => {
    const next = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((id) => id !== roleId)
      : [...selectedRoleIds, roleId];
    form.setValue('role_ids', next, { shouldDirty: true, shouldValidate: true });
  };

  let accessContent: ReactNode;
  if (!canReadRoles) {
    accessContent = (
      <p className="text-sm text-muted-foreground">
        Your account can create users here, but it cannot read tenant roles, so access assignment is
        hidden.
      </p>
    );
  } else if (!canAssignRoles) {
    accessContent = (
      <p className="text-sm text-muted-foreground">
        Your account can view tenant roles, but it cannot assign them during user creation.
      </p>
    );
  } else if (rolesQuery.isPending) {
    accessContent = <p className="text-sm text-muted-foreground">Loading available roles...</p>;
  } else if (rolesQuery.isError) {
    accessContent = (
      <p className="text-sm text-destructive">
        Unable to load roles for access assignment right now.
      </p>
    );
  } else if (availableRoles.length === 0) {
    accessContent = (
      <p className="text-sm text-muted-foreground">
        No active roles are available yet. Create roles first, then assign them here.
      </p>
    );
  } else {
    accessContent = (
      <div className="space-y-3">
        {availableRoles.map((role, index) => {
          const capabilitiesQuery = roleCapabilityQueries.at(index);
          const checked = selectedRoleIds.includes(role.id);

          let capabilityContent: ReactNode;
          if (!capabilitiesQuery || capabilitiesQuery.isPending) {
            capabilityContent = (
              <p className="text-xs text-muted-foreground">Loading capabilities...</p>
            );
          } else if (capabilitiesQuery.isError) {
            capabilityContent = (
              <p className="text-xs text-destructive">
                Unable to load capabilities for this role.
              </p>
            );
          } else if (capabilitiesQuery.data && capabilitiesQuery.data.length > 0) {
            capabilityContent = (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {capabilitiesQuery.data.map((capability) => (
                  <li key={capability.id}>
                    <span className="font-medium text-foreground">{capability.display_name}</span>
                    {' · '}
                    <code>{capability.capability_key}</code>
                  </li>
                ))}
              </ul>
            );
          } else {
            capabilityContent = (
              <p className="text-xs text-muted-foreground">
                This role currently has no capabilities assigned.
              </p>
            );
          }

          return (
            <label
              key={role.id}
              className={`block rounded-lg border p-3 cursor-pointer ${checked ? 'border-primary bg-primary/5' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  onChange={() => toggleRole(role.id)}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <div className="font-medium">{role.display_name}</div>
                    <div className="text-xs text-muted-foreground">{role.code}</div>
                    {role.description ? (
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    ) : null}
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2">
                    <p className="text-xs font-medium mb-2">Granted capabilities</p>
                    {capabilityContent}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border p-6 space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="c_full_name">Full name</Label>
        <Input id="c_full_name" {...form.register('full_name')} />
        {form.formState.errors.full_name && (
          <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c_email">Email</Label>
        <Input id="c_email" type="email" {...form.register('email')} />
        <p className="text-xs text-muted-foreground">
          Current login flow uses this email together with the password below.
        </p>
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c_password">Password</Label>
        <Input id="c_password" type="password" autoComplete="new-password" {...form.register('password')} />
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c_phone">Phone</Label>
        <Input id="c_phone" {...form.register('phone')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c_username">Username</Label>
        <Input id="c_username" {...form.register('username')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c_org_id">Organization id (UUID)</Label>
        <Input id="c_org_id" {...form.register('org_id')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c_department">Department</Label>
        <Input id="c_department" {...form.register('department')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c_clearance">Clearance tier (0–3)</Label>
        <Input id="c_clearance" type="number" min={0} max={3} {...form.register('clearance_tier_required')} />
      </div>
      <div className="space-y-3">
        <div>
          <Label>Access roles and granted capabilities</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Select the tenant roles this user should control at creation time when your account is
            allowed to assign them. The capability list below shows exactly what each role grants.
          </p>
        </div>
        {accessContent}
      </div>
      <Button type="submit" disabled={create.isPending}>
        Create user
      </Button>
    </form>
  );
}
