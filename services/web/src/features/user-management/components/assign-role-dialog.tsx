import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { toast } from 'sonner';
import { CapabilityGate } from '@/components/capability-gate';
import { useCapability } from '@/hooks/use-capability';
import { ApiError } from '@/lib/api-client';
import { UM_ROLE_ASSIGN, UM_ROLE_READ } from '@/lib/runtime-capability-keys';
import { useApplyRoleTemplate } from '../api/mutations';
import { roleCapabilitiesOptions } from '../api/queries';
import type { UmRole } from '../types';
import {
  buildApplyRoleTemplateRequestBody,
  RoleTemplateCapabilityPicker,
} from './role-template-capability-picker';

function mutationErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body?.trim();
    if (body) return body.length > 280 ? `${body.slice(0, 280)}...` : body;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

type AssignRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  availableRoles: UmRole[];
  tenantScope?: string;
};

export function AssignRoleDialog({
  open,
  onOpenChange,
  userId,
  availableRoles,
  tenantScope,
}: AssignRoleDialogProps) {
  const umRoleRead = useCapability(UM_ROLE_READ);
  const [roleId, setRoleId] = useState('');
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<string[]>([]);
  const applyRole = useApplyRoleTemplate(userId, tenantScope);

  const roleCapabilitiesQuery = useQuery({
    ...roleCapabilitiesOptions(roleId, tenantScope),
    enabled: open && Boolean(roleId) && umRoleRead,
    staleTime: 30_000,
  });

  const allRoleCapabilityIds =
    roleCapabilitiesQuery.data?.map((capability) => capability.id) ?? [];
  const stillLoading =
    Boolean(roleId) &&
    umRoleRead &&
    (roleCapabilitiesQuery.isFetching || roleCapabilitiesQuery.data === undefined);

  const handleClose = () => {
    onOpenChange(false);
    setRoleId('');
    setSelectedCapabilityIds([]);
  };

  const handleAssign = () => {
    if (!roleId) return;
    if (allRoleCapabilityIds.length > 0 && selectedCapabilityIds.length === 0) {
      toast.error('Pick at least one permission for this role.');
      return;
    }

    applyRole.mutate(
      buildApplyRoleTemplateRequestBody(roleId, selectedCapabilityIds, allRoleCapabilityIds),
      {
        onSuccess: () => {
          toast.success('Role added');
          handleClose();
        },
        onError: (error) => {
          toast.error(mutationErrorMessage(error));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="flex max-h-[min(92dvh,880px)] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl lg:max-w-5xl">
        <div className="shrink-0 border-b p-4 pb-3">
          <DialogHeader>
            <DialogTitle>Add a role</DialogTitle>
            <DialogDescription>
              Choose a role, then pick permissions by product module, feature, and action.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
          <div className="shrink-0 space-y-2">
            <Label htmlFor="assign-role-select">Role</Label>
            <Select
              value={roleId}
              onValueChange={(value) => {
                setRoleId(value);
                setSelectedCapabilityIds([]);
              }}
            >
              <SelectTrigger id="assign-role-select" disabled={availableRoles.length === 0}>
                <SelectValue
                  placeholder={
                    availableRoles.length === 0 ? 'No more roles to add' : 'Choose a role'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {roleId ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <RoleTemplateCapabilityPicker
                roleId={roleId}
                tenantScope={tenantScope}
                selectedCapabilityIds={selectedCapabilityIds}
                onSelectedCapabilityIdsChange={setSelectedCapabilityIds}
                plainLanguage
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t px-4 py-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <CapabilityGate capability={UM_ROLE_ASSIGN}>
            <Button
              type="button"
              disabled={!roleId || applyRole.isPending || stillLoading}
              onClick={handleAssign}
            >
              {applyRole.isPending ? 'Adding...' : 'Add role'}
            </Button>
          </CapabilityGate>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
