import { HTTP } from '@cerbos/http';

const CERBOS_URL = import.meta.env.VITE_CERBOS_URL ?? 'http://localhost:3592';

/**
 * Direct Cerbos HTTP client (e.g. `@cerbos/react` / ad-hoc `checkResources` from the browser).
 *
 * **Shell / nav UX:** prefer {@link hydratePermissionsFromBackend} in `lib/permissions.ts`, which calls
 * `GET /api/user-management/auth/permissions-map` so decisions stay aligned with the same PDP checks as APIs.
 */
export const cerbosClient = new HTTP(CERBOS_URL);
