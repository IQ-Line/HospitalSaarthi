import { z } from 'zod';

/**
 * Sign-in form contract — username-primary login (ADR-0003). Lives here (not inline
 * in the login route) so it is the single source of truth both the route and its
 * unit test import, rather than the test re-implementing a copy.
 */
export const signInSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInValues = z.infer<typeof signInSchema>;

/**
 * Normalizes the submitted username before it is sent to better-auth
 * (`authClient.signIn.username`): trimmed + lowercased so casing/whitespace never
 * splits an account. Keep the route and its test using THIS function.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
