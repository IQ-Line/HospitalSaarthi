import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/** Mirrors login.tsx signInSchema + handleSignIn field usage. */
const signInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

describe('login sign-in payload', () => {
  it('maps validated form values to better-auth email (not username)', () => {
    const values = signInSchema.parse({
      email: 'platform@hospitalsaarthi.dev',
      password: 'password',
    });

    expect(values.email).toBe('platform@hospitalsaarthi.dev');
    expect(
      signInSchema.safeParse({ username: 'platform@hospitalsaarthi.dev', password: 'password' })
        .success,
    ).toBe(false);
  });
});
