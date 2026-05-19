import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@pulse/ui/button';
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
import type { UmUser, UpdateUserBody } from '../types';
import { useUpdateUser } from '../api/mutations';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.union([z.literal(''), z.string().email('Enter a valid email')]),
  phone: z.string(),
  username: z.string(),
  department: z.string(),
});

type FormValues = z.infer<typeof schema>;

function toPatch(values: FormValues): UpdateUserBody {
  return {
    full_name: values.full_name,
    email: values.email === '' ? null : values.email ?? null,
    phone: values.phone === '' ? null : values.phone,
    username: values.username === '' ? null : values.username,
    department: values.department === '' ? null : values.department,
  };
}

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UmUser;
};

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const update = useUpdateUser(user.id);
  const { reset, handleSubmit, register, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user.full_name,
      email: user.email ?? '',
      phone: user.phone ?? '',
      username: user.username ?? '',
      department: user.department ?? '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      full_name: user.full_name,
      email: user.email ?? '',
      phone: user.phone ?? '',
      username: user.username ?? '',
      department: user.department ?? '',
    });
  }, [open, reset, user.full_name, user.email, user.phone, user.username, user.department]);

  const onSubmit = handleSubmit((values) => {
    update.mutate(toPatch(values), {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update this person&apos;s contact and work details.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full name</Label>
              <Input id="edit_full_name" {...register('full_name')} />
              {formState.errors.full_name ? (
                <p className="text-sm text-destructive">{formState.errors.full_name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input id="edit_email" type="email" {...register('email')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input id="edit_phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_username">Username</Label>
                <Input id="edit_username" {...register('username')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_department">Department</Label>
              <Input id="edit_department" {...register('department')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
