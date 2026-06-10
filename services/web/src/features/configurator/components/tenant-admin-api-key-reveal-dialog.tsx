import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Could not copy to clipboard');
  }
}

export function TenantAdminApiKeyRevealDialog({
  apiKeySecret,
  onDismiss,
}: {
  apiKeySecret: string | null;
  onDismiss: () => void;
}) {
  return (
    <Dialog
      open={apiKeySecret != null}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save tenant admin API key</DialogTitle>
          <DialogDescription>
            This integration key is shown once when the tenant admin is created. Copy it now —
            it is not returned on tenant list APIs and cannot be retrieved later from the UI.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/40 p-3">
          <code className="block break-all text-xs font-mono">{apiKeySecret}</code>
        </div>
        <p className="text-xs text-muted-foreground">
          Use it with{' '}
          <code className="bg-muted px-1 py-0.5 rounded">POST /api/user-management/auth/api-key/validate</code>{' '}
          to obtain Bearer tokens for partner APIs.
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (apiKeySecret) void copyToClipboard(apiKeySecret);
            }}
          >
            <Copy className="size-4 mr-1" />
            Copy
          </Button>
          <Button type="button" onClick={onDismiss}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
