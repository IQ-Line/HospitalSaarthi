import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@pulse/ui/alert';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  useActivateIntegration,
  useDeleteIntegration,
  useDisableIntegration,
  useIssueApiKey,
  useReactivateIntegration,
  useRevokeApiKey,
} from '../api/mutations';
import {
  useIntegrationApiKeysSuspense,
  useIntegrationDetailSuspense,
} from '../api/queries';
import { IntegrationStatusBadge } from './integration-status-badge';

type IntegrationDetailPanelProps = {
  tenantId: string;
  integrationId: string;
  canEdit: boolean;
  onBack: () => void;
  onDeleted: () => void;
};

export function IntegrationDetailPanel({
  tenantId,
  integrationId,
  canEdit,
  onBack,
  onDeleted,
}: IntegrationDetailPanelProps) {
  const { data: integration } = useIntegrationDetailSuspense(tenantId, integrationId);
  const { data: apiKeys } = useIntegrationApiKeysSuspense(tenantId, integrationId);
  const activate = useActivateIntegration(tenantId);
  const disable = useDisableIntegration(tenantId);
  const reactivate = useReactivateIntegration(tenantId);
  const remove = useDeleteIntegration(tenantId);
  const issueKey = useIssueApiKey(tenantId);
  const revokeKey = useRevokeApiKey(tenantId);
  const [issuedSecret, setIssuedSecret] = useState<string | null>(null);

  async function handleIssueKey() {
    const issued = await issueKey.mutateAsync(integrationId);
    setIssuedSecret(issued.plaintext_secret);
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button type="button" variant="ghost" size="sm" className="h-auto px-0" onClick={onBack}>
            ← Back to list
          </Button>
          <h3 className="text-base font-semibold tracking-tight">{integration.display_name}</h3>
          <p className="text-sm text-muted-foreground">Type: {integration.integration_type}</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {integration.status === 'draft' ? (
              <>
                <Button
                  type="button"
                  disabled={activate.isPending}
                  onClick={() => void activate.mutateAsync(integrationId)}
                >
                  Activate
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() =>
                    void remove.mutateAsync(integrationId).then(() => {
                      onDeleted();
                    })
                  }
                >
                  Delete draft
                </Button>
              </>
            ) : null}
            {integration.status === 'active' ? (
              <Button
                type="button"
                variant="outline"
                disabled={disable.isPending}
                onClick={() => void disable.mutateAsync(integrationId)}
              >
                Disable
              </Button>
            ) : null}
            {integration.status === 'disabled' ? (
              <Button
                type="button"
                disabled={reactivate.isPending}
                onClick={() => void reactivate.mutateAsync(integrationId)}
              >
                Reactivate
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status</span>
          <IntegrationStatusBadge status={integration.status} />
        </div>
        <div>
          <span className="text-muted-foreground">Allowed operations: </span>
          {integration.config.allowedOperations.join(', ') || '—'}
        </div>
        {integration.config.suggestedCapabilityKeys?.length ? (
          <div>
            <span className="text-muted-foreground">Suggested capabilities (draft UX): </span>
            {integration.config.suggestedCapabilityKeys.join(', ')}
          </div>
        ) : null}
        {integration.partner_principal_id ? (
          <div>
            <span className="text-muted-foreground">Partner principal: </span>
            <code className="text-xs">{integration.partner_principal_id}</code>
          </div>
        ) : null}
      </div>

      {issuedSecret ? (
        <Alert>
          <AlertTitle>API key issued — copy now</AlertTitle>
          <AlertDescription>
            <code className="block break-all text-xs">{issuedSecret}</code>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-medium">API keys</h4>
          {canEdit && integration.status === 'active' ? (
            <Button
              type="button"
              size="sm"
              disabled={issueKey.isPending}
              onClick={() => void handleIssueKey()}
            >
              Issue key
            </Button>
          ) : null}
        </div>
        {apiKeys.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {apiKeys.items.map((key) => (
              <li
                key={key.api_key_id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <code>{key.key_prefix}…</code>
                  <Badge variant={key.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                    {key.status}
                  </Badge>
                </div>
                {canEdit && key.status === 'active' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={revokeKey.isPending}
                    onClick={() =>
                      void revokeKey.mutateAsync({
                        integrationId,
                        apiKeyId: key.api_key_id,
                      })
                    }
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
