import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Suspense, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@pulse/ui/alert';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { CapabilityGate } from '@/components/capability-gate';
import { PageHeader } from '@/components/page-header';
import {
  IH_API_KEY_ISSUE,
  IH_API_KEY_REVOKE,
  IH_INTEGRATION_ACTIVATE,
  IH_INTEGRATION_DELETE,
  IH_INTEGRATION_DISABLE,
  IH_INTEGRATION_REACTIVATE,
} from '@/lib/runtime-capability-keys';
import {
  useActivateIntegration,
  useDeleteIntegration,
  useDisableIntegration,
  useIssueApiKey,
  useReactivateIntegration,
  useRevokeApiKey,
} from '@/features/integration-hub/api/mutations';
import {
  integrationApiKeysOptions,
  integrationDetailOptions,
  useIntegrationApiKeysSuspense,
  useIntegrationDetailSuspense,
} from '@/features/integration-hub/api/queries';
import { IntegrationStatusBadge } from '@/features/integration-hub/components/integration-status-badge';

export const Route = createFileRoute('/_authenticated/integration-hub/$integrationId')({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(integrationDetailOptions(params.integrationId)),
      context.queryClient.ensureQueryData(integrationApiKeysOptions(params.integrationId)),
    ]);
  },
  component: IntegrationDetailPage,
});

function IntegrationDetailPage() {
  const { integrationId } = Route.useParams();
  const [issuedSecret, setIssuedSecret] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 p-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <IntegrationDetailContent
          integrationId={integrationId}
          issuedSecret={issuedSecret}
          onIssuedSecret={setIssuedSecret}
        />
      </Suspense>
    </div>
  );
}

function IntegrationDetailContent({
  integrationId,
  issuedSecret,
  onIssuedSecret,
}: {
  integrationId: string;
  issuedSecret: string | null;
  onIssuedSecret: (value: string | null) => void;
}) {
  const { data: integration } = useIntegrationDetailSuspense(integrationId);
  const { data: apiKeys } = useIntegrationApiKeysSuspense(integrationId);
  const navigate = useNavigate();
  const activate = useActivateIntegration();
  const disable = useDisableIntegration();
  const reactivate = useReactivateIntegration();
  const remove = useDeleteIntegration();
  const issueKey = useIssueApiKey();
  const revokeKey = useRevokeApiKey();

  async function handleIssueKey() {
    const issued = await issueKey.mutateAsync(integrationId);
    onIssuedSecret(issued.plaintext_secret);
  }

  return (
    <>
      <div className="text-sm">
        <Link to="/integration-hub" className="text-primary hover:underline">
          ← Integrations
        </Link>
      </div>
      <PageHeader
        title={integration.display_name}
        description={`Type: ${integration.integration_type}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {integration.status === 'draft' ? (
              <>
                <CapabilityGate capability={IH_INTEGRATION_ACTIVATE}>
                  <Button
                    type="button"
                    disabled={activate.isPending}
                    onClick={() => void activate.mutateAsync(integrationId)}
                  >
                    Activate
                  </Button>
                </CapabilityGate>
                <CapabilityGate capability={IH_INTEGRATION_DELETE}>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={() =>
                      void remove.mutateAsync(integrationId).then(() => {
                        void navigate({ to: '/integration-hub' });
                      })
                    }
                  >
                    Delete draft
                  </Button>
                </CapabilityGate>
              </>
            ) : null}
            {integration.status === 'active' ? (
              <CapabilityGate capability={IH_INTEGRATION_DISABLE}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disable.isPending}
                  onClick={() => void disable.mutateAsync(integrationId)}
                >
                  Disable
                </Button>
              </CapabilityGate>
            ) : null}
            {integration.status === 'disabled' ? (
              <CapabilityGate capability={IH_INTEGRATION_REACTIVATE}>
                <Button
                  type="button"
                  disabled={reactivate.isPending}
                  onClick={() => void reactivate.mutateAsync(integrationId)}
                >
                  Reactivate
                </Button>
              </CapabilityGate>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 rounded-lg border p-4 text-sm">
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
          <h3 className="text-lg font-medium">API keys</h3>
          {integration.status === 'active' ? (
            <CapabilityGate capability={IH_API_KEY_ISSUE}>
              <Button
                type="button"
                size="sm"
                disabled={issueKey.isPending}
                onClick={() => void handleIssueKey()}
              >
                Issue key
              </Button>
            </CapabilityGate>
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
                {key.status === 'active' ? (
                  <CapabilityGate capability={IH_API_KEY_REVOKE}>
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
                  </CapabilityGate>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
