import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import type { CreateUserBody } from '../types';
import { useCreateUser } from '../api/mutations';

const schema = z.object({
  full_name: z.string().min(1, 'Required'),
  email: z.union([z.literal(''), z.string().email()]),
  phone: z.string(),
  username: z.string(),
  org_id: z.union([z.literal(''), z.string().uuid()]),
  department: z.string(),
  clearance_tier_required: z.coerce.number().int().min(0).max(3),
});

type FormValues = z.infer<typeof schema>;

function toBody(values: FormValues): CreateUserBody {
  return {
    full_name: values.full_name,
    email: values.email === '' ? null : values.email,
    phone: values.phone === '' ? null : values.phone,
    username: values.username === '' ? null : values.username,
    org_id: values.org_id === '' ? null : values.org_id,
    department: values.department === '' ? null : values.department,
    clearance_tier_required: values.clearance_tier_required,
  };
}

export function CreateUserForm() {
  const navigate = useNavigate();
  const create = useCreateUser();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      username: '',
      org_id: '',
      department: '',
      clearance_tier_required: 0,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(toBody(values), {
      onSuccess: (user) => {
        void navigate({
          to: '/user-management/$userId',
          params: { userId: user.id },
        });
      },
    });
  });

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
      <Button type="submit" disabled={create.isPending}>
        Create user
      </Button>
    </form>
  );
}
