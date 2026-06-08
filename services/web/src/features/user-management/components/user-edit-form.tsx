import { useEffect, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { indianMobileZodFieldOptional, sanitizeIndianMobileInput } from '@/lib/indian-mobile';
import type { UmUser, UpdateUserBody } from '../types';
import { useUpdateUser } from '../api/mutations';
import { UserManagementSectionCard } from './user-management-section-card';

const schema = z.object({
  full_name: z.string().min(1, 'Required'),
  email: z.union([z.literal(''), z.string().email()]),
  phone: indianMobileZodFieldOptional(),
  username: z.string(),
  org_id: z.union([z.literal(''), z.string().uuid()]),
  department: z.string(),
  clearance_tier_required: z.coerce.number().int().min(0).max(3),
});

type FormValues = z.infer<typeof schema>;

function toPatch(values: FormValues): UpdateUserBody {
  return {
    full_name: values.full_name,
    email: values.email === '' ? null : values.email ?? null,
    phone: values.phone === '' ? null : values.phone,
    username: values.username === '' ? null : values.username,
    org_id: values.org_id === '' ? null : values.org_id,
    department: values.department === '' ? null : values.department,
    clearance_tier_required: values.clearance_tier_required,
  };
}

export function UserEditForm({ user }: { user: UmUser }) {
  const update = useUpdateUser(user.id);
  const { reset, handleSubmit, register, control, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user.full_name,
      email: user.email ?? '',
      phone: user.phone ?? '',
      username: user.username ?? '',
      org_id: user.org_id ?? '',
      department: user.department ?? '',
      clearance_tier_required: user.clearance_tier_required ?? 0,
    },
  });

  useEffect(() => {
    reset({
      full_name: user.full_name,
      email: user.email ?? '',
      phone: user.phone ?? '',
      username: user.username ?? '',
      org_id: user.org_id ?? '',
      department: user.department ?? '',
      clearance_tier_required: user.clearance_tier_required ?? 0,
    });
  }, [
    reset,
    user.id,
    user.full_name,
    user.email,
    user.phone,
    user.username,
    user.org_id,
    user.department,
    user.clearance_tier_required,
    user.status,
  ]);

  const onSubmit = handleSubmit((values) => {
    update.mutate(toPatch(values));
  });

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <UserManagementSectionCard
        title="Edit profile"
        description="Update the user's core profile and tenant-scoped routing details."
        contentClassName="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...register('full_name')} />
            {formState.errors.full_name && (
              <p className="text-sm text-destructive">{formState.errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="Enter 10-digit number"
              {...register('phone', {
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  e.target.value = sanitizeIndianMobileInput(e.target.value);
                },
              })}
            />
            {formState.errors.phone ? (
              <p className="text-sm text-destructive">{formState.errors.phone.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...register('username')} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="org_id">Organization id (UUID)</Label>
            <Input id="org_id" {...register('org_id')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clearance_tier_required">Clearance tier (0–3)</Label>
            <Input
              id="clearance_tier_required"
              type="number"
              min={0}
              max={3}
              {...register('clearance_tier_required')}
            />
          </div>
        </div>

        <Button type="submit" disabled={update.isPending}>
          Save changes
        </Button>
      </UserManagementSectionCard>
    </form>
  );
}
