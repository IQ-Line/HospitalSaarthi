import { DEVELOPMENT_SEED_USERS } from '@hims/dev-bootstrap';

/**
 * Dev-only sign-in shortcuts (UI). Credentials must match `make seed` / `pnpm seed`.
 * Authorization is always hydrated from `GET /auth/principal` after better-auth sign-in.
 */
export const DEVELOPMENT_SIGN_IN_SHORTCUTS = DEVELOPMENT_SEED_USERS.map((user) => ({
  label: user.name,
  description: user.description,
  email: user.email,
  password: user.password,
}));
