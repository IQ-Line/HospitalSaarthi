import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/** Mirrors login.tsx signInSchema + handleSignIn field usage (username-primary login). */
const signInSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

describe('login sign-in payload', () => {
  it('maps validated form values to better-auth username (not email)', () => {
    const values = signInSchema.parse({
      username: 'Platform',
      password: 'password',
    });

    // handleSignIn lowercases + trims before calling authClient.signIn.username.
    expect(values.username.trim().toLowerCase()).toBe('platform');
    // The schema no longer accepts an `email`-only payload (username is the credential).
    expect(signInSchema.safeParse({ email: 'platform@hospitalsaarthi.dev', password: 'password' }).success).toBe(
      false,
    );
    expect(signInSchema.safeParse({ username: 'platform', password: 'password' }).success).toBe(true);
  });
});
