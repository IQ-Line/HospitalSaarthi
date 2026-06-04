import { useEffect, useMemo, useState } from 'react';
import { areCapabilityIdsEqual, capabilityIdsSignature } from '../lib/capability-id-set';
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
import { toast } from 'sonner';
import { CapabilityGate } from '@/components/capability-gate';
import { useCapability } from '@/hooks/use-capability';
import { ApiError } from '@/lib/api-client';
import { UM_ROLE_ASSIGN, UM_ROLE_READ } from '@/lib/runtime-capability-keys';
import { useApplyRoleTemplate } from '../api/mutations';
import { roleCapabilitiesOptions } from '../api/queries';
import type { AppliedRoleTemplate } from '../types';
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

type ManageRolePermissionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  tenantScope?: string;
  applied: AppliedRoleTemplate | null;
  grantedCapabilityIds: string[];
};

export function ManageRolePermissionsDialog({
  open,
  onOpenChange,
  userId,
  tenantScope,
  applied,
  grantedCapabilityIds,
}: ManageRolePermissionsDialogProps) {
  const umRoleRead = useCapability(UM_ROLE_READ);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState(grantedCapabilityIds);
  const applyRole = useApplyRoleTemplate(userId, tenantScope);

  const roleId = applied?.role_id ?? '';
  const roleCapabilitiesQuery = useQuery({
    ...roleCapabilitiesOptions(roleId, tenantScope),
    enabled: open && Boolean(roleId) && umRoleRead,
  });

  const allRoleCapabilityIds = useMemo(
    () => (roleCapabilitiesQuery.data ?? []).map((capability) => capability.id),
    [roleCapabilitiesQuery.data],
  );

  const grantedIdsSignature = capabilityIdsSignature(grantedCapabilityIds);

  useEffect(() => {
    if (!open) return;
    setSelectedCapabilityIds((current) =>
      areCapabilityIdsEqual(current, grantedCapabilityIds)
        ? current
        : [...grantedCapabilityIds],
    );
  }, [open, grantedIdsSignature, grantedCapabilityIds]);

  const selectionDirty = useMemo(() => {
    const current = [...selectedCapabilityIds].sort();
    const baseline = [...grantedCapabilityIds].sort();
    if (current.length !== baseline.length) return true;
    return current.some((id, index) => id !== baseline[index]);
  }, [grantedCapabilityIds, selectedCapabilityIds]);

  const handleClose = () => {
    onOpenChange(false);
    setSelectedCapabilityIds(grantedCapabilityIds);
  };

  const handleSave = () => {
    if (!applied) return;
    if (allRoleCapabilityIds.length > 0 && selectedCapabilityIds.length === 0) {
      toast.error('Pick at least one permission for this role.');
      return;
    }

    applyRole.mutate(
      buildApplyRoleTemplateRequestBody(
        applied.role_id,
        selectedCapabilityIds,
        allRoleCapabilityIds,
      ),
      {
        onSuccess: () => {
          toast.success('Permissions updated');
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(mutationErrorMessage(error));
        },
      },
    );
  };

  if (!applied) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="flex max-h-[min(92dvh,880px)] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl lg:max-w-5xl">
        <div className="shrink-0 border-b p-4 pb-3">
          <DialogHeader>
            <DialogTitle>{applied.role.display_name}</DialogTitle>
            <DialogDescription>
              Choose permissions by product module, feature, and action (three catalog layers).
              Unticked items are not allowed for this person.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <RoleTemplateCapabilityPicker
            roleId={applied.role_id}
            tenantScope={tenantScope}
            selectedCapabilityIds={selectedCapabilityIds}
            onSelectedCapabilityIdsChange={setSelectedCapabilityIds}
            selectAllCapabilitiesOnLoad={false}
            initialSelectedCapabilityIds={grantedCapabilityIds}
            plainLanguage
          />
          </div>
        </div>

        <CapabilityGate
          capability={UM_ROLE_ASSIGN}
          fallback={
            <DialogFooter className="shrink-0 border-t px-4 py-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          }
        >
          <DialogFooter className="shrink-0 border-t px-4 py-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                applyRole.isPending || !selectionDirty || roleCapabilitiesQuery.isPending
              }
              onClick={handleSave}
            >
              {applyRole.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </CapabilityGate>
      </DialogContent>
    </Dialog>
  );
}
