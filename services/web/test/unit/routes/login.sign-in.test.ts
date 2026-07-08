import { describe, expect, it } from 'vitest';
import {
  normalizeUsername,
  signInSchema,
} from '@/features/auth/lib/sign-in-form';

// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- fake credential in a unit-test fixture, not a real secret (#50 verified)
const FAKE_PASSWORD = 'password';

describe('login sign-in payload', () => {
  it('normalizes the username the way handleSignIn sends it to better-auth', () => {
    // The REAL normalizer login.tsx applies before authClient.signIn.username(...).
    expect(normalizeUsername('  Platform ')).toBe('platform');
    expect(normalizeUsername('ADMIN')).toBe('admin');
  });

  it('accepts a username+password payload', () => {
    const parsed = signInSchema.safeParse({ username: 'platform', password: FAKE_PASSWORD });
    expect(parsed.success).toBe(true);
  });

  it('rejects an email-only payload (username is the credential, not email)', () => {
    const parsed = signInSchema.safeParse({
      email: 'platform@hospitalsaarthi.dev',
      password: FAKE_PASSWORD,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a blank username and a blank password', () => {
    expect(signInSchema.safeParse({ username: '', password: FAKE_PASSWORD }).success).toBe(false);
    expect(signInSchema.safeParse({ username: 'platform', password: '' }).success).toBe(false);
  });
});
