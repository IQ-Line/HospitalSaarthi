import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields, jwtClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  basePath: '/api/auth',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [
    jwtClient(),
    inferAdditionalFields({
      user: {
        iq_tenant_id: { type: 'string', required: true, input: true },
        platform_user_id: { type: 'string', required: true, input: true },
      },
    }),
  ],
});
