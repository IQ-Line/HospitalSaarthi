/**
 * HIMS page-builder integration constants.
 * Edit these directly — no .env / VITE_* required.
 */
export const PAGE_BUILDER_CLIENT_ID = '6a22a2e81243988f8d4cebb5';

/** Workflow-backend (page resolve, render, workflows). */
export const PAGE_BUILDER_WORKFLOW_BACKEND_URL = 'http://localhost:5000/workflow-backend';

/** BFF for form field prepopulate / select APIs. */
export const PAGE_BUILDER_BUSINESS_API_URL = 'http://localhost:3100';

/** Routes served from SMS Studio page builder (all others use legacy code routes). */
export const PAGE_BUILDER_ROUTE_PATHS = ['/frontdesk/create-opd-registration'] as const;

export function getLcNcClientId(): string {
  return PAGE_BUILDER_CLIENT_ID;
}

export function isPageBuilderRoute(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return (PAGE_BUILDER_ROUTE_PATHS as readonly string[]).includes(normalized);
}

/**
 * Workflow-backend base URL for page resolve/render APIs.
 * Dev: same-origin `/workflow-backend` via Vite proxy (avoids CORS).
 */
export function getFormWorkflowBuilderOrigin(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/workflow-backend`;
  }
  return PAGE_BUILDER_WORKFLOW_BACKEND_URL.replace(/\/+$/, '');
}

/** Business API origin for renderer prepopulate calls. */
export function getBusinessApiOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return PAGE_BUILDER_BUSINESS_API_URL.replace(/\/+$/, '');
}
