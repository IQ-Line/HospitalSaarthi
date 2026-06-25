import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields, jwtClient, usernameClient } from 'better-auth/client/plugins';
import { resolveBrowserApiBaseUrl } from '@/lib/api-base-url';

export const authClient = createAuthClient({
  baseURL: resolveBrowserApiBaseUrl(),
  basePath: '/api/auth',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [
    jwtClient(),
    usernameClient(),
    inferAdditionalFields({
      user: {
        iq_tenant_id: { type: 'string', required: true, input: true },
        platform_user_id: { type: 'string', required: true, input: true },
      },
    }),
  ],
});
