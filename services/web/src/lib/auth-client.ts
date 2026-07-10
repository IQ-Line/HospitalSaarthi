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
    // Username-primary login (authn spec §2 / ADR-0003): surfaces authClient.signIn.username.
    usernameClient(),
    inferAdditionalFields({
      user: {
        iq_tenant_id: { type: 'string', required: true, input: true },
        platform_user_id: { type: 'string', required: true, input: true },
      },
    }),
  ],
});
