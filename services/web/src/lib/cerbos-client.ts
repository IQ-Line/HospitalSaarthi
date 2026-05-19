import { HTTP } from '@cerbos/http';

const CERBOS_URL = import.meta.env.VITE_CERBOS_URL ?? 'http://localhost:3592';

/**
 * Direct Cerbos HTTP client (e.g. `@cerbos/react` / ad-hoc `checkResources` from the browser).
 *
 * **Shell / nav UX:** prefer {@link hydrateCapabilitiesFromPrincipal} in `lib/permissions.ts`, which
 * loads runtime capability keys from `GET /auth/principal`.
 */
export const cerbosClient = new HTTP(CERBOS_URL);
