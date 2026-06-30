/**
 * Local dev port map for HIMS (scripts/start-dev-stack.mts + root .env).
 *
 * Defaults avoid common conflicts with other local apps on:
 *   3000, 3001, 5000, 5173, 5174, 5432
 *
 * Override any value in `.env.local` (gitignored) if you need different ports.
 */

/** Ports used by other apps on this machine — never kill listeners here. */
export const PROTECTED_FOREIGN_PORTS: readonly number[] = [
  3000, 3001, 5000, 5173, 5174, 5432,
] as const;

/** HIMS stack ports (must be free before start). */
export const HIMS_DEV_PORTS = {
  bff: 3100,
  configurator: 3101,
  empi: 3002,
  billing: 3003,
  pharmacy: 3004,
  userManagement: 3005,
  registration: 3006,
  integrationHub: 3007,
  inventory: 3008,
  recordFoundation: 3009,
  web: 5180,
  masterData: 8010,
  opd: 8020,
  /** Docker host mapping for Citus Postgres (container still listens on 5432 internally). */
  postgresHost: 15432,
  pgbouncer: 6432,
  cerbosAdmin: 3592,
  cerbosPdp: 3593,
} as const;

export const HIMS_DOCKER_PORTS: readonly number[] = [
  HIMS_DEV_PORTS.postgresHost,
  HIMS_DEV_PORTS.pgbouncer,
  HIMS_DEV_PORTS.cerbosAdmin,
  HIMS_DEV_PORTS.cerbosPdp,
] as const;

/** Node/Python app ports — safe to kill stale listeners before start. */
export const HIMS_APP_PORTS: readonly number[] = [
  HIMS_DEV_PORTS.bff,
  HIMS_DEV_PORTS.configurator,
  HIMS_DEV_PORTS.empi,
  HIMS_DEV_PORTS.billing,
  HIMS_DEV_PORTS.pharmacy,
  HIMS_DEV_PORTS.userManagement,
  HIMS_DEV_PORTS.registration,
  HIMS_DEV_PORTS.integrationHub,
  HIMS_DEV_PORTS.inventory,
  HIMS_DEV_PORTS.recordFoundation,
  HIMS_DEV_PORTS.web,
  HIMS_DEV_PORTS.masterData,
  HIMS_DEV_PORTS.opd,
] as const;

export const HIMS_REQUIRED_PORTS: readonly number[] = [
  ...HIMS_APP_PORTS,
  ...HIMS_DOCKER_PORTS,
] as const;

export const HIMS_PORT_LABELS: Record<number, string> = {
  [HIMS_DEV_PORTS.bff]: 'bff',
  [HIMS_DEV_PORTS.configurator]: 'configurator-svc',
  [HIMS_DEV_PORTS.empi]: 'empi-svc',
  [HIMS_DEV_PORTS.billing]: 'billing-svc',
  [HIMS_DEV_PORTS.pharmacy]: 'pharmacy-svc',
  [HIMS_DEV_PORTS.userManagement]: 'user-management-svc',
  [HIMS_DEV_PORTS.registration]: 'registration-svc',
  [HIMS_DEV_PORTS.integrationHub]: 'integration-hub-svc',
  [HIMS_DEV_PORTS.inventory]: 'inventory-svc',
  [HIMS_DEV_PORTS.recordFoundation]: 'record-foundation-svc',
  [HIMS_DEV_PORTS.web]: 'web (Vite)',
  [HIMS_DEV_PORTS.masterData]: 'master-data',
  [HIMS_DEV_PORTS.opd]: 'opd-svc',
  [HIMS_DEV_PORTS.postgresHost]: 'postgres (docker host)',
  [HIMS_DEV_PORTS.pgbouncer]: 'pgbouncer (docker)',
  [HIMS_DEV_PORTS.cerbosAdmin]: 'cerbos admin (docker)',
  [HIMS_DEV_PORTS.cerbosPdp]: 'cerbos PDP (docker)',
};

export const HIMS_WEB_ORIGIN = `http://localhost:${HIMS_DEV_PORTS.web}`;
export const HIMS_BFF_ORIGIN = `http://localhost:${HIMS_DEV_PORTS.bff}`;

/** Local Docker Postgres — used only when HIMS_USE_LOCAL_DB=true or DATABASE_URL is localhost. */
export const LOCAL_DATABASE_URL = `postgresql://hims:hims@localhost:${HIMS_DEV_PORTS.postgresHost}/hims_dev`;
export const LOCAL_MASTER_DATA_DATABASE_URL = `postgresql+psycopg://hims:hims@localhost:${HIMS_DEV_PORTS.postgresHost}/hims_dev`;
export const LOCAL_OPD_DATABASE_URL = `postgresql+psycopg://hims:hims@localhost:${HIMS_DEV_PORTS.postgresHost}/hims_dev`;
export const LOCAL_PGBOUNCER_URL = `postgresql://hims:hims@localhost:${HIMS_DEV_PORTS.pgbouncer}/hims_dev`;

/** True when DATABASE_URL points at a non-local host (e.g. Azure dev shared). */
export function isRemoteDatabaseUrl(connectionString?: string): boolean {
  const raw = (connectionString ?? process.env.DATABASE_URL ?? '').trim();
  if (!raw) return false;
  try {
    const normalized = raw.replace(/^postgresql\+psycopg:\/\//, 'postgresql://');
    const host = new URL(normalized).hostname.toLowerCase();
    return host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.local');
  } catch {
    return false;
  }
}

/** Opt-in local Docker DB via HIMS_USE_LOCAL_DB=true (never overrides Azure URLs by default). */
export function usesLocalDockerDatabase(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.HIMS_USE_LOCAL_DB === 'true' || env.HIMS_USE_LOCAL_DB === '1') return true;
  const url = env.DATABASE_URL?.trim();
  if (!url) return true;
  return !isRemoteDatabaseUrl(url);
}

/** Dev port remap only — does NOT override DATABASE_URL (respects .env / Azure). */
export function applyDevPortEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  env.BFF_PORT = String(HIMS_DEV_PORTS.bff);
  env.CONFIGURATOR_SVC_PORT = String(HIMS_DEV_PORTS.configurator);
  env.WEB_DEV_PORT = String(HIMS_DEV_PORTS.web);
  env.VITE_API_BASE_URL = HIMS_BFF_ORIGIN;
  env.AUTH_BASE_URL = HIMS_BFF_ORIGIN;
  env.JWT_ISSUER = HIMS_BFF_ORIGIN;
  env.JWKS_URL = `${HIMS_BFF_ORIGIN}/api/auth/.well-known/jwks.json`;
  env.WEB_PUBLIC_ORIGIN = HIMS_WEB_ORIGIN;
  env.REPORT_WEB_ORIGIN = HIMS_WEB_ORIGIN;
  env.CONFIGURATOR_URL = `http://localhost:${HIMS_DEV_PORTS.configurator}`;
  env.CERBOS_URL = `grpc://localhost:${HIMS_DEV_PORTS.cerbosPdp}`;
  env.VITE_CERBOS_URL = `http://localhost:${HIMS_DEV_PORTS.cerbosAdmin}`;
  if (isRemoteDatabaseUrl(env.DATABASE_URL)) {
    // Shared Azure DB — OPD alembic on every uvicorn boot causes long timeouts when VPN is flaky.
    env.OPD_SKIP_MIGRATE = 'true';
  }
  return env;
}

/** Apply local Docker DB URLs — only when usesLocalDockerDatabase() is true. */
export function applyLocalDatabaseEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  if (!usesLocalDockerDatabase(env)) return env;
  env.DATABASE_URL = LOCAL_DATABASE_URL;
  env.MASTER_DATA_DATABASE_URL = LOCAL_MASTER_DATA_DATABASE_URL;
  env.OPD_DATABASE_URL = LOCAL_OPD_DATABASE_URL;
  env.PGBOUNCER_URL = LOCAL_PGBOUNCER_URL;
  return env;
}

/** Port remap + optional local DB override (Azure .env is left untouched by default). */
export function applyLocalDevEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  applyDevPortEnv(env);
  applyLocalDatabaseEnv(env);
  return env;
}
