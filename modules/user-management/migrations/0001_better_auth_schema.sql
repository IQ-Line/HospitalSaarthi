-- Custom SQL migration file, put your code below! --
-- LOCAL EXCEPTION (NON-distributable): the better-auth `auth` schema.
-- These tables are owned/managed by better-auth (Phase 1A.7): JWT plugin (RS256) +
-- email/password + session + verification + JWKS key storage. They use TEXT primary
-- keys (no iq_tenant_id shard key), so they are NOT modelled in src/schema/tables.ts and
-- are NEVER run through Citus create_distributed_table / create_reference_table — they stay
-- plain Postgres tables on the coordinator. Journaled here so the single applyMigrations
-- runner still creates them exactly once. IF NOT EXISTS guards are kept defensively even
-- though the journal already guarantees once-only execution (ties to the AuthN phase, where
-- this schema will be re-owned by the better-auth adapter).
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth."user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL,
  CONSTRAINT "uq_auth_user_email" UNIQUE ("email"),
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "iq_tenant_id" text NOT NULL,
  "platform_user_id" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_auth_user_platform_user_id"
  ON auth."user" ("platform_user_id")
  WHERE "platform_user_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth."session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL,
  CONSTRAINT "uq_auth_session_token" UNIQUE ("token"),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES auth."user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth."account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES auth."user" ("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth."verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth."jwks" (
  "id" text PRIMARY KEY,
  "publicKey" text NOT NULL,
  "privateKey" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "expiresAt" timestamptz
);
