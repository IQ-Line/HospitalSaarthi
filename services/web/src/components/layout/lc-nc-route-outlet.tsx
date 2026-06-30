import { Outlet, useNavigate, useParams, useRouterState } from '@tanstack/react-router';
import { LcNcRouteOutlet } from 'iq-line-form-builder-renderer';
import { LcNcPageFallback } from '@/components/layout/lc-nc-page-fallback';
import { getRendererAuthHeaders } from '@/lib/renderer-host-bootstrap';
import { getLcNcClientId, isPageBuilderRoute } from '@/lib/lc-nc-config';
import { useTenantStore } from '@/stores/tenant.store';

/**
 * Authenticated shell outlet.
 * Listed page-builder routes render from SMS Studio; all others use legacy `<Outlet />`.
 */
export function LcNcAuthenticatedOutlet() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const routeParams = useParams({ strict: false }) as Record<string, string>;
  const tenantId = useTenantStore((s) => s.tenantId);
  const clientId = getLcNcClientId();

  const onNavigate = (path: string) => {
    void navigate({ to: path });
  };

  if (!isPageBuilderRoute(pathname)) {
    return <Outlet />;
  }

  return (
    <LcNcRouteOutlet
      enabled
      routePath={pathname}
      routeParams={routeParams}
      clientId={clientId}
      tenantId={tenantId ?? undefined}
      chrome="none"
      getAuthHeaders={getRendererAuthHeaders}
      onNavigate={onNavigate}
      fallback={<LcNcPageFallback routePath={pathname} />}
    />
  );
}
