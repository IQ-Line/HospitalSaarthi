import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/** Mirrors login.tsx signInSchema + handleSignIn field usage. */
const signInSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Username is required')
    .superRefine((value, ctx) => {
      if (value.includes('@') && !z.string().email().safeParse(value).success) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid email' });
      }
    }),
  password: z.string().min(1, 'Password is required'),
});

function resolveSignInMethod(identifier: string): 'email' | 'username' {
  return identifier.includes('@') ? 'email' : 'username';
}

describe('login sign-in payload', () => {
  it('accepts username identifier for platform login', () => {
    const values = signInSchema.parse({
      identifier: 'platform',
      password: 'password',
    });

    expect(values.identifier).toBe('platform');
    expect(resolveSignInMethod(values.identifier)).toBe('username');
  });

  it('accepts email identifier as backward-compatible fallback', () => {
    const values = signInSchema.parse({
      identifier: 'platform@hospitalsaarthi.dev',
      password: 'password',
    });

    expect(values.identifier).toBe('platform@hospitalsaarthi.dev');
    expect(resolveSignInMethod(values.identifier)).toBe('email');
  });

  it('rejects invalid email-shaped identifiers', () => {
    expect(
      signInSchema.safeParse({ identifier: 'not-an-email@', password: 'password' }).success,
    ).toBe(false);
  });
});
