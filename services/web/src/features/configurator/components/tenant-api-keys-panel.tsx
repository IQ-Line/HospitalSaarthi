import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Copy, KeyRound, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { DataTable } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  useCreateTenantApiKey,
  useTenantApiKeys,
  useUpdateTenantApiKeyStatus,
  type TenantApiKey,
  type TenantApiKeyEnvironment,
  type TenantApiKeyStatus,
} from '@/features/configurator/api/tenant-api-keys';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';

function formatShortDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeVariant(status: TenantApiKeyStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'active') return 'default';
  if (status === 'disabled') return 'secondary';
  return 'destructive';
}

function statusLabel(status: TenantApiKeyStatus): string {
  if (status === 'active') return 'Active';
  if (status === 'disabled') return 'Disabled';
  return 'Revoked';
}

type PendingAction =
  | { kind: 'disable'; key: TenantApiKey }
  | { kind: 'enable'; key: TenantApiKey }
  | { kind: 'revoke'; key: TenantApiKey };

export function TenantApiKeysPanel({
  iqTenantId,
  canManageKeys = true,
}: {
  iqTenantId: string;
  canManageKeys?: boolean;
}) {
  const { data, isLoading } = useTenantApiKeys(iqTenantId, { enabled: !!iqTenantId });
  const createKey = useCreateTenantApiKey();
  const updateStatus = useUpdateTenantApiKeyStatus();

  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [environment, setEnvironment] = useState<TenantApiKeyEnvironment>('live');
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const rows = data?.data ?? [];

  const resetCreateForm = () => {
    setLabel('');
    setEnvironment('live');
  };

  const handleCreate = () => {
    createKey.mutate(
      {
        tenantId: iqTenantId,
        input: {
          environment,
          label: label.trim() || null,
        },
      },
      {
        onSuccess: (created) => {
          setCreateOpen(false);
          resetCreateForm();
          setRevealedSecret(created.secret);
          toast.success('API key created');
        },
        onError: (err) => {
          toast.error(mutationErrorMessage(err));
        },
      },
    );
  };

  const runStatusUpdate = (key: TenantApiKey, status: TenantApiKeyStatus) => {
    updateStatus.mutate(
      { tenantId: iqTenantId, apiKeyId: key.api_key_id, status },
      {
        onSuccess: () => {
          toast.success(`API key ${statusLabel(status).toLowerCase()}`);
          setPendingAction(null);
        },
        onError: (err) => {
          toast.error(mutationErrorMessage(err));
        },
      },
    );
  };

  const copySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const columns = useMemo<ColumnDef<TenantApiKey, unknown>[]>(
    () => [
      {
        accessorKey: 'label',
        header: 'Label',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.label?.trim() || '—'}</span>
        ),
      },
      {
        accessorKey: 'key_prefix',
        header: 'Key prefix',
        cell: ({ getValue }) => (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{getValue<string>()}…</code>
        ),
      },
      {
        accessorKey: 'environment',
        header: 'Environment',
        cell: ({ getValue }) => (
          <Badge variant="outline" className="font-normal capitalize">
            {getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: 'purpose',
        header: 'Purpose',
        cell: () => <span className="text-sm text-muted-foreground">OPD slip PDF</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue<TenantApiKeyStatus>();
          return (
            <Badge variant={statusBadgeVariant(status)} className="font-normal">
              {statusLabel(status)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'last_used_at',
        header: 'Last used',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatShortDate(getValue<string | null>())}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatShortDate(getValue<string>())}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const key = row.original;
          if (!canManageKeys || key.status === 'revoked') {
            return <div className="text-right text-muted-foreground text-xs">—</div>;
          }

          const busy =
            updateStatus.isPending &&
            pendingAction?.key.api_key_id === key.api_key_id;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    aria-label="API key actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {key.status === 'active' ? (
                    <DropdownMenuItem
                      onClick={() => setPendingAction({ kind: 'disable', key })}
                    >
                      Disable
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => setPendingAction({ kind: 'enable', key })}
                    >
                      Enable
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setPendingAction({ kind: 'revoke', key })}
                  >
                    Revoke
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canManageKeys, pendingAction?.key.api_key_id, updateStatus.isPending],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            API keys
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Machine credentials for external integrations (e.g. Smart Report). Keys grant access
            to download OPD slip PDFs for this tenant via{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">X-API-Key</code>.
          </p>
        </div>
        {canManageKeys ? (
          <Button
            type="button"
            className="shrink-0 bg-[#008C9E] text-white hover:bg-[#00798a]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4 mr-1" />
            Create API key
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyTitle="No API keys yet"
          emptyDescription={
            canManageKeys
              ? 'Create a key to let Smart Report fetch OPD slip PDFs for this tenant.'
              : 'No API keys have been provisioned for this tenant.'
          }
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              The full secret is shown once after creation. Store it securely — it cannot be
              retrieved again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="api-key-label">Label (optional)</Label>
              <Input
                id="api-key-label"
                value={label}
                maxLength={120}
                placeholder="Smart Report production"
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key-environment">Environment</Label>
              <Select
                value={environment}
                onValueChange={(v) => setEnvironment(v as TenantApiKeyEnvironment)}
              >
                <SelectTrigger id="api-key-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createKey.isPending}
              onClick={handleCreate}
            >
              {createKey.isPending ? 'Creating…' : 'Create key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={revealedSecret != null}
        onOpenChange={(open) => {
          if (!open) setRevealedSecret(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Save your API key</DialogTitle>
            <DialogDescription>
              Copy this secret now. For security, it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3">
            <code className="block break-all text-xs font-mono">{revealedSecret}</code>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (revealedSecret) void copySecret(revealedSecret);
              }}
            >
              <Copy className="size-4 mr-1" />
              Copy
            </Button>
            <Button type="button" onClick={() => setRevealedSecret(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingAction?.kind === 'disable'}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title="Disable API key?"
        description="Requests using this key will be rejected until you enable it again."
        confirmLabel="Disable"
        onConfirm={() => {
          if (pendingAction?.kind === 'disable') {
            runStatusUpdate(pendingAction.key, 'disabled');
          }
        }}
      />

      <ConfirmDialog
        open={pendingAction?.kind === 'enable'}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title="Enable API key?"
        description="This key will be accepted again for OPD slip PDF requests."
        confirmLabel="Enable"
        onConfirm={() => {
          if (pendingAction?.kind === 'enable') {
            runStatusUpdate(pendingAction.key, 'active');
          }
        }}
      />

      <ConfirmDialog
        open={pendingAction?.kind === 'revoke'}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title="Revoke API key?"
        description="This permanently invalidates the key. Create a new key if the integration needs access again."
        confirmLabel="Revoke"
        destructive
        onConfirm={() => {
          if (pendingAction?.kind === 'revoke') {
            runStatusUpdate(pendingAction.key, 'revoked');
          }
        }}
      />
    </div>
  );
}
