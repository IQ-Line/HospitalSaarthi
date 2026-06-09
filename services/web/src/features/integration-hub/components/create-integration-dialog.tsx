import { useEffect, useMemo, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
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
import { integrationTypeCatalogOptions } from '../api/queries';
import { useCreateIntegration } from '../api/mutations';

type CreateIntegrationDialogProps = {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateIntegrationDialog({
  tenantId,
  open,
  onOpenChange,
}: CreateIntegrationDialogProps) {
  const { data } = useSuspenseQuery(integrationTypeCatalogOptions());
  const create = useCreateIntegration(tenantId);
  const integrationType = data.items[0]?.type ?? 'partner';
  const [displayName, setDisplayName] = useState('');
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSelectedOperations([]);
    setDisplayName('');
  }, [open]);

  const operationsByGroup = useMemo(() => {
    const groups = new Map<string, typeof data.partner_operations>();
    for (const op of data.partner_operations) {
      const list = groups.get(op.group) ?? [];
      list.push(op);
      groups.set(op.group, list);
    }
    return [...groups.entries()];
  }, [data.partner_operations]);

  function toggleOperation(operationId: string, checked: boolean) {
    setSelectedOperations((current) => {
      if (checked) {
        return current.includes(operationId) ? current : [...current, operationId];
      }
      return current.filter((id) => id !== operationId);
    });
  }

  const canSubmit =
    displayName.trim().length > 0 && selectedOperations.length > 0 && !create.isPending;

  async function handleSubmit() {
    const name = displayName.trim();
    if (!name || selectedOperations.length === 0) return;

    await create.mutateAsync({
      integration_type: integrationType,
      display_name: name,
      config: { allowedOperations: selectedOperations },
    });
    setDisplayName('');
    setSelectedOperations([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New integration</DialogTitle>
          <DialogDescription>
            Create a draft partner integration. Select which inbound APIs to enable, then activate
            to provision the partner principal and issue API keys. Partners authenticate with{' '}
            <code className="text-xs">X-Api-Key</code> (preferred) or{' '}
            <code className="text-xs">Authorization: Bearer</code> as fallback.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="ih-name">Display name</Label>
            <Input
              id="ih-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. LC/NC — Acme"
            />
          </div>
          <div className="grid gap-3">
            <div>
              <Label>Enabled APIs</Label>
              <p className="text-muted-foreground text-sm">
                Choose which inbound operations this integration may call after activation.
              </p>
            </div>
            {operationsByGroup.map(([group, operations]) => (
              <div key={group} className="grid gap-2 rounded-md border p-3">
                <p className="text-sm font-medium">{group}</p>
                <ul className="grid gap-2">
                  {operations.map((op) => {
                    const checked = selectedOperations.includes(op.id);
                    const inputId = `ih-op-${op.id}`;
                    return (
                      <li key={op.id}>
                        <label
                          htmlFor={inputId}
                          className="flex cursor-pointer items-start gap-2 text-sm"
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            className="mt-0.5"
                            checked={checked}
                            onChange={(e) => toggleOperation(op.id, e.target.checked)}
                          />
                          <span>
                            <span className="font-medium">{op.label}</span>
                            <span className="text-muted-foreground block text-xs">
                              {op.description}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
