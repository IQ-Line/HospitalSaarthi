import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { integrationTypeCatalogOptions } from '../api/queries';
import { useCreateIntegration } from '../api/mutations';

type CreateIntegrationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateIntegrationDialog({ open, onOpenChange }: CreateIntegrationDialogProps) {
  const { data } = useSuspenseQuery(integrationTypeCatalogOptions());
  const create = useCreateIntegration();
  const [displayName, setDisplayName] = useState('');
  const [integrationType, setIntegrationType] = useState(
    data.items[0]?.type ?? 'smart_report',
  );

  async function handleSubmit() {
    const name = displayName.trim();
    if (!name) return;
    await create.mutateAsync({ integration_type: integrationType, display_name: name });
    setDisplayName('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New integration</DialogTitle>
          <DialogDescription>
            Create a draft partner integration. Activate it to provision the partner principal and
            issue API keys.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="ih-type">Type</Label>
            <Select value={integrationType} onValueChange={setIntegrationType}>
              <SelectTrigger id="ih-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.items.map((entry) => (
                  <SelectItem key={entry.type} value={entry.type}>
                    {entry.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ih-name">Display name</Label>
            <Input
              id="ih-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Smart Report — Acme"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!displayName.trim() || create.isPending}
            onClick={() => void handleSubmit()}
          >
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
