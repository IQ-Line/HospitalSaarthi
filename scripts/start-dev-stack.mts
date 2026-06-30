#!/usr/bin/env tsx
/**
 * HIMS local dev stack launcher (Windows-first, cross-platform).
 *
 * Usage:
 *   pnpm start          — fresh bootstrap: auto-stop old servers, docker, minimal dev stack
 *   pnpm start -- --skip-kill     — do not free ports first
 *   pnpm start -- --skip-docker   — skip docker compose (infra already up)
 *   pnpm start -- --skip-wait     — do not wait for Postgres health
 *   pnpm start -- --skip-migrate  — skip db migrations (already applied)
 *   pnpm start -- --skip-seed     — skip dev seed check
 *   pnpm start -- --verbose       — extra debug output
 *
 * Logs: .logs/start-dev-stack.log
 *
 * Canonical ports: docs/dev/port-allocation.md
 */

import { execSync, spawn, type ExecSyncOptionsWithStringEncoding } from 'node:child_process';
import { createRequire } from 'node:module';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyLocalDevEnv,
  HIMS_APP_PORTS,
  HIMS_BFF_ORIGIN,
  HIMS_DOCKER_PORTS,
  HIMS_PORT_LABELS,
  HIMS_REQUIRED_PORTS,
  HIMS_WEB_ORIGIN,
  HIMS_DEV_PORTS,
  LOCAL_DATABASE_URL,
  PROTECTED_FOREIGN_PORTS,
  usesLocalDockerDatabase,
} from './dev-stack-ports.mts';
import { stopHimsDevServers } from './stop-hims-dev-servers.mts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, '..');
const moduleRequire = createRequire(resolve(WORKSPACE_ROOT, 'packages/ts-sdk-db/package.json'));
const DOCKER_COMPOSE_FILE = 'infra/docker/docker-compose.yml';
const LOG_DIR = resolve(WORKSPACE_ROOT, '.logs');
const LOG_FILE = resolve(LOG_DIR, 'start-dev-stack.log');

const REQUIRED_PORTS = HIMS_REQUIRED_PORTS;
const PORT_LABELS = HIMS_PORT_LABELS;

const OPTIONAL_PORTS: readonly number[] = [4318, 8091] as const;

const args = process.argv.slice(2);
const skipKill = args.includes('--skip-kill');
const skipDocker = args.includes('--skip-docker');
const skipWait = args.includes('--skip-wait');
const skipMigrate = args.includes('--skip-migrate');
const skipSeed = args.includes('--skip-seed');
const fullStack = args.includes('--full');
const verbose = args.includes('--verbose');

const isWin = process.platform === 'win32';
let currentStep = 0;
/** Updated in main() once bootstrap step list is known. */
let totalSteps = 12;

type LogLevel = 'INFO' | 'OK' | 'WARN' | 'ERROR' | 'DEBUG' | 'STEP';

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function writeLogFile(line: string): void {
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch {
    // Never crash the launcher because logging failed
  }
}

function emit(level: LogLevel, msg: string, toConsole = true): void {
  const line = `[${timestamp()}] [${level.padEnd(5)}] ${msg}`;
  writeLogFile(line);
  if (!toConsole) return;
  switch (level) {
    case 'ERROR':
      console.error(line);
      break;
    case 'WARN':
      console.warn(line);
      break;
    case 'DEBUG':
      if (verbose) console.log(line);
      break;
    default:
      console.log(line);
  }
}

function log(msg: string): void {
  emit('INFO', msg);
}

function ok(msg: string): void {
  emit('OK', msg);
}

function warn(msg: string): void {
  emit('WARN', msg);
}

function debug(msg: string): void {
  emit('DEBUG', msg);
}

function step(title: string): void {
  currentStep += 1;
  emit('STEP', `(${currentStep}/${totalSteps}) ${title}`);
}

function fail(msg: string, detail?: string): never {
  emit('ERROR', msg);
  if (detail) {
    for (const line of detail.split(/\r?\n/)) {
      if (line.trim()) emit('ERROR', `  ${line}`);
    }
  }
  emit('ERROR', `Full log saved to: ${LOG_FILE}`);
  emit('ERROR', 'Troubleshooting: re-run with --verbose, or check Docker Desktop + .env');
  process.exit(1);
}

class CommandError extends Error {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
  readonly command: string;

  constructor(command: string, exitCode: number | null, stdout: string, stderr: string) {
    const summary = stderr.trim() || stdout.trim() || `exit code ${exitCode ?? 'unknown'}`;
    super(`Command failed: ${command}\n${summary}`);
    this.name = 'CommandError';
    this.command = command;
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

function devChildEnv(): NodeJS.ProcessEnv {
  return applyLocalDevEnv({ ...process.env });
}

function run(cmd: string, opts?: { cwd?: string; stdio?: 'inherit' | 'pipe'; label?: string }): string {
  const cwd = opts?.cwd ?? WORKSPACE_ROOT;
  const label = opts?.label ?? cmd;
  const env = devChildEnv();

  if (opts?.stdio === 'inherit') {
    debug(`exec (inherit): ${cmd}`);
    try {
      execSync(cmd, { cwd, stdio: 'inherit', env, windowsHide: true });
      return '';
    } catch (err: unknown) {
      const e = err as { status?: number; stdout?: Buffer; stderr?: Buffer };
      throw new CommandError(
        label,
        e.status ?? null,
        e.stdout?.toString('utf8') ?? '',
        e.stderr?.toString('utf8') ?? '',
      );
    }
  }

  debug(`exec: ${cmd}`);
  const execOpts: ExecSyncOptionsWithStringEncoding = {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    env,
    windowsHide: true,
  };

  try {
    const out = execSync(cmd, execOpts).trim();
    if (verbose && out) debug(`stdout: ${out.slice(0, 500)}${out.length > 500 ? '…' : ''}`);
    return out;
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    throw new CommandError(label, e.status ?? null, e.stdout ?? '', e.stderr ?? '');
  }
}

function runSafe(cmd: string, label: string): { ok: boolean; output: string; error?: CommandError } {
  try {
    return { ok: true, output: run(cmd, { label }) };
  } catch (err) {
    if (err instanceof CommandError) {
      return { ok: false, output: err.stderr || err.stdout, error: err };
    }
    return { ok: false, output: String(err) };
  }
}

function commandExists(name: string): boolean {
  const cmd = isWin ? `where ${name}` : `command -v ${name}`;
  const result = runSafe(cmd, `check ${name}`);
  if (result.ok) debug(`found: ${name} → ${result.output.split(/\r?\n/)[0] ?? ''}`);
  return result.ok;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function portLabel(port: number): string {
  return PORT_LABELS[port] ? `${port} (${PORT_LABELS[port]})` : String(port);
}

function loadEnvFile(filePath: string, override: boolean): void {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadWorkspaceEnv(): void {
  loadEnvFile(resolve(WORKSPACE_ROOT, '.env'), false);
  loadEnvFile(resolve(WORKSPACE_ROOT, '.env.local'), true);
}

function maskDatabaseUrl(url: string): string {
  try {
    const normalized = url.replace(/^postgresql\+psycopg:\/\//, 'postgresql://');
    const parsed = new URL(normalized);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(invalid DATABASE_URL)';
  }
}

function ensureEnvFile(): void {
  step('Ensuring .env exists');
  const envPath = resolve(WORKSPACE_ROOT, '.env');
  const examplePath = resolve(WORKSPACE_ROOT, '.env.example');
  if (existsSync(envPath)) {
    ok('.env exists');
    return;
  }
  if (!existsSync(examplePath)) {
    fail('Missing .env and .env.example — cannot bootstrap.');
  }
  copyFileSync(examplePath, envPath);
  ok('Created .env from .env.example');
}

function ensureDevEnvironment(): void {
  step('Applying dev environment (.env + port remap)');
  loadWorkspaceEnv();
  applyLocalDevEnv();

  if (usesLocalDockerDatabase()) {
    ok(`DATABASE_URL → local Docker (${LOCAL_DATABASE_URL})`);
  } else {
    ok(`DATABASE_URL → remote (${maskDatabaseUrl(process.env.DATABASE_URL ?? '')})`);
    ok('Remote shared DB — runs login migrations only; OPD_SKIP_MIGRATE=true');
  }
  ok(`Web → ${HIMS_WEB_ORIGIN} | BFF → ${HIMS_BFF_ORIGIN}`);
}

function ensureNodeModules(): void {
  step('Installing Node dependencies');
  const nodeModules = resolve(WORKSPACE_ROOT, 'node_modules');
  if (existsSync(nodeModules)) {
    ok('node_modules present — skipping pnpm install');
    return;
  }
  log('node_modules missing — running pnpm install…');
  try {
    run('pnpm install', { stdio: 'inherit', label: 'pnpm install' });
    ok('pnpm install completed');
  } catch (err) {
    const detail =
      err instanceof CommandError
        ? [err.stderr, err.stdout].filter(Boolean).join('\n')
        : err instanceof Error
          ? err.message
          : String(err);
    fail('pnpm install failed.', detail);
  }
}

function ensurePythonModules(): void {
  step('Setting up Python modules (opd, master-data)');
  if (!commandExists('uv')) {
    fail(
      'uv is required for opd-svc and master-data.',
      'Install: https://docs.astral.sh/uv/getting-started/installation/',
    );
  }
  for (const target of ['opd:setup', 'master-data:setup'] as const) {
    log(`  nx run ${target}`);
    try {
      run(`npx nx run ${target}`, { stdio: 'inherit', label: `nx run ${target}` });
    } catch (err) {
      const detail =
        err instanceof CommandError
          ? [err.stderr, err.stdout].filter(Boolean).join('\n')
          : err instanceof Error
            ? err.message
            : String(err);
      fail(`Python setup failed: ${target}`, detail);
    }
  }
  ok('Python modules ready');
}

function isDatabaseSeeded(): boolean {
  const result = runSafe(
    `docker compose -f ${DOCKER_COMPOSE_FILE} exec -T postgres psql -U hims -d hims_dev -tAc "SELECT COUNT(*) FROM configurator.tenants;"`,
    'check configurator.tenants',
  );
  if (!result.ok) {
    debug(`seed check failed: ${result.output}`);
    return false;
  }
  const count = Number.parseInt(result.output.trim(), 10);
  return Number.isFinite(count) && count > 0;
}

function runDevelopmentSeed(): void {
  step('Seeding development data (pnpm seed)');
  try {
    run('pnpm seed', { stdio: 'inherit', label: 'pnpm seed' });
    ok('Development seed completed');
    log('Default sign-in credentials are printed above by the seed script.');
  } catch (err) {
    const detail =
      err instanceof CommandError
        ? [err.stderr, err.stdout].filter(Boolean).join('\n')
        : err instanceof Error
          ? err.message
          : String(err);
    fail('pnpm seed failed.', detail);
  }
}

async function ensureAppPortsFreeOrFail(): Promise<void> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt === 1) {
      step('Ensuring HIMS app ports are free');
    } else {
      log(`Port cleanup retry ${attempt}/${maxAttempts}…`);
    }
    const { stillBusy } = freeAllPorts({ silent: true });
    if (stillBusy.length === 0) {
      ok('All HIMS app ports are free');
      return;
    }
    if (attempt < maxAttempts) {
      await sleep(2000);
    } else {
      fail(
        `Cannot start — app ports still in use: ${stillBusy.map(portLabel).join(', ')}`,
        'Close other terminals running pnpm dev / vite / node, or run PowerShell as Administrator.',
      );
    }
  }
}

async function waitForCerbos(maxAttempts = 45): Promise<void> {
  step('Waiting for Cerbos health');
  for (let i = 1; i <= maxAttempts; i++) {
    const httpCheck = runSafe(
      'curl -sf http://localhost:3592/_cerbos/health',
      'cerbos health',
    );
    if (httpCheck.ok) {
      ok(`Cerbos ready after ${i}s`);
      return;
    }
    if (i === 1 || i % 10 === 0) {
      log(`  still waiting for Cerbos… attempt ${i}/${maxAttempts}`);
    }
    if (i === maxAttempts) {
      warn('Cerbos health check timed out — seed/authz may fail if Cerbos is not up');
      return;
    }
    await sleep(1000);
  }
}

function checkPrerequisites(): void {
  step('Checking prerequisites');

  if (!commandExists('node')) {
    fail('Node.js is required (>= 24). Install from https://nodejs.org/');
  }
  try {
    const nodeVer = run('node -v', { label: 'node -v' });
    ok(`Node.js ${nodeVer}`);
  } catch (err) {
    warn(`Could not read node version: ${err instanceof Error ? err.message : err}`);
  }

  if (!commandExists('pnpm')) {
    fail('pnpm is required. Install: npm i -g pnpm');
  }
  try {
    const pnpmVer = run('pnpm -v', { label: 'pnpm -v' });
    ok(`pnpm ${pnpmVer}`);
  } catch (err) {
    warn(`Could not read pnpm version: ${err instanceof Error ? err.message : err}`);
  }

  if (!skipDocker && !commandExists('docker')) {
    fail('Docker CLI not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/');
  }
  if (!skipDocker) ok('docker CLI found');

  if (!commandExists('uv')) {
    warn('uv not found yet — required before Python services start');
  } else {
    ok('uv found (Python services)');
  }
}

function checkDockerRunning(): void {
  if (skipDocker) {
    warn('--skip-docker: skipping Docker daemon check');
    return;
  }

  step('Verifying Docker daemon');
  const result = runSafe('docker info', 'docker info');
  if (!result.ok) {
    fail(
      'Docker Desktop is not running or not reachable.',
      result.error?.stderr || result.error?.stdout || result.output,
    );
  }
  ok('Docker daemon is running');

  const ps = runSafe(`docker compose -f ${DOCKER_COMPOSE_FILE} ps`, 'docker compose ps');
  if (ps.ok && ps.output.trim()) {
    debug(`docker compose ps:\n${ps.output}`);
  }
}

function pidsOnPortWindows(port: number): number[] {
  const pids = new Set<number>();
  const result = runSafe(`netstat -ano -p tcp | findstr :${port}`, `netstat :${port}`);
  if (!result.ok) return [];
  for (const line of result.output.split(/\r?\n/)) {
    if (!/LISTENING/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (Number.isFinite(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

function pidsOnPortUnix(port: number): number[] {
  const pids = new Set<number>();
  const result = runSafe(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, `lsof :${port}`);
  if (!result.ok) return [];
  for (const line of result.output.split(/\r?\n/)) {
    const pid = Number(line.trim());
    if (Number.isFinite(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

function processNameForPid(pid: number): string {
  if (isWin) {
    const r = runSafe(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, `tasklist ${pid}`);
    if (r.ok && r.output) {
      const match = r.output.match(/^"([^"]+)"/);
      return match?.[1] ?? 'unknown';
    }
  } else {
    const r = runSafe(`ps -p ${pid} -o comm=`, `ps ${pid}`);
    if (r.ok && r.output.trim()) return r.output.trim();
  }
  return 'unknown';
}

function killPid(pid: number, port: number): boolean {
  if (pid === process.pid) {
    warn(`Skipping kill of own PID ${pid} on port ${port}`);
    return false;
  }
  const name = processNameForPid(pid);
  // /T kills child processes (e.g. vite under nx) so the port stays free on Windows.
  const killResult = runSafe(
    isWin ? `taskkill /F /T /PID ${pid}` : `kill -9 ${pid}`,
    `kill PID ${pid}`,
  );
  if (killResult.ok) {
    ok(`Freed ${portLabel(port)} — killed PID ${pid} (${name})`);
    return true;
  }
  warn(
    `Could not kill PID ${pid} (${name}) on ${portLabel(port)}: ${killResult.error?.stderr || killResult.output}`,
  );
  return false;
}

function freePort(port: number): { freed: number; blocked: number; skipped: boolean } {
  if (PROTECTED_FOREIGN_PORTS.includes(port as (typeof PROTECTED_FOREIGN_PORTS)[number])) {
    debug(`${portLabel(port)} — skipped (protected foreign port, not owned by HIMS)`);
    return { freed: 0, blocked: 0, skipped: true };
  }

  const pids = isWin ? pidsOnPortWindows(port) : pidsOnPortUnix(port);
  if (pids.length === 0) {
    debug(`${portLabel(port)} — already free`);
    return { freed: 0, blocked: 0, skipped: false };
  }

  log(`${portLabel(port)} — ${pids.length} listener(s): ${pids.join(', ')}`);
  let freed = 0;
  let blocked = 0;
  for (const pid of pids) {
    if (killPid(pid, port)) freed += 1;
    else blocked += 1;
  }
  return { freed, blocked, skipped: false };
}

function stopDockerStack(): void {
  step('Stopping existing Docker stack');
  const result = runSafe(`docker compose -f ${DOCKER_COMPOSE_FILE} down`, 'docker compose down');
  if (result.ok) {
    ok('docker compose down completed');
  } else {
    warn('docker compose down failed or nothing was running — continuing');
    if (result.error) {
      debug(result.error.stderr || result.error.stdout);
    }
  }
}

async function stopDockerStackAsync(): Promise<void> {
  stopDockerStack();
  // Give Docker Desktop a moment to release host port bindings on Windows.
  await sleep(isWin ? 1500 : 500);
}

function freeAllPorts(opts?: { silent?: boolean }): { totalFreed: number; stillBusy: number[] } {
  if (!opts?.silent) {
    step('Freeing HIMS application ports');
  }
  log(`App ports: ${HIMS_APP_PORTS.join(', ')}`);
  log(`Docker ports (${HIMS_DOCKER_PORTS.join(', ')}) — managed via docker compose, not taskkill`);
  log(
    `Protected (never kill): ${PROTECTED_FOREIGN_PORTS.join(', ')} — used by your other application`,
  );

  let totalFreed = 0;
  const stillBusy: number[] = [];

  for (const port of HIMS_APP_PORTS) {
    const { freed } = freePort(port);
    totalFreed += freed;

    const remaining = isWin ? pidsOnPortWindows(port) : pidsOnPortUnix(port);
    if (remaining.length > 0) {
      stillBusy.push(port);
      warn(`${portLabel(port)} still in use by PID(s): ${remaining.join(', ')}`);
    }
  }

  if (stillBusy.length === 0) {
    ok(`Port cleanup done — killed ${totalFreed} stale process(es), all app ports free`);
  } else {
    warn(
      `Port cleanup partial — ${stillBusy.length} app port(s) still busy: ${stillBusy.map(portLabel).join(', ')}`,
    );
    warn('Close the blocking app manually, or run Terminal as Administrator');
  }

  return { totalFreed, stillBusy };
}

function startDockerInfra(): void {
  step('Starting Docker infrastructure (Postgres, PgBouncer, Cerbos)');
  try {
    run(`docker compose -f ${DOCKER_COMPOSE_FILE} up -d`, { stdio: 'inherit', label: 'docker compose up -d' });
    ok('docker compose up -d completed');
  } catch (err) {
    const detail =
      err instanceof CommandError
        ? [err.stderr, err.stdout].filter(Boolean).join('\n')
        : err instanceof Error
          ? err.message
          : String(err);
    fail('Failed to start Docker infrastructure.', detail);
  }

  const ps = runSafe(`docker compose -f ${DOCKER_COMPOSE_FILE} ps`, 'docker compose ps');
  if (ps.ok) {
    log('Container status:');
    for (const line of ps.output.split(/\r?\n/)) {
      if (line.trim()) log(`  ${line}`);
    }
  }

  const unhealthy = runSafe(
    `docker compose -f ${DOCKER_COMPOSE_FILE} ps --format "{{.Name}} {{.Status}}"`,
    'docker compose ps status',
  );
  if (unhealthy.ok) {
    for (const line of unhealthy.output.split(/\r?\n/)) {
      if (/unhealthy|Exit|Restarting/i.test(line)) {
        warn(`Container issue: ${line}`);
      }
    }
  }
}

async function waitForPostgres(maxAttempts = 90): Promise<void> {
  step('Waiting for PostgreSQL health (pg_isready)');
  let lastError = '';

  for (let i = 1; i <= maxAttempts; i++) {
    const result = runSafe(
      `docker compose -f ${DOCKER_COMPOSE_FILE} exec -T postgres pg_isready -U hims -d hims_dev`,
      'pg_isready',
    );

    if (result.ok) {
      ok(`PostgreSQL ready after ${i}s`);
      return;
    }

    lastError = result.error?.stderr || result.error?.stdout || result.output || 'unknown';

    if (i === 1 || i % 10 === 0) {
      log(`  still waiting… attempt ${i}/${maxAttempts}`);
      debug(`  pg_isready: ${lastError}`);
    }

    if (i === maxAttempts) {
      const logs = runSafe(
        `docker compose -f ${DOCKER_COMPOSE_FILE} logs --tail 40 postgres`,
        'postgres logs',
      );
      fail(
        `PostgreSQL did not become ready within ${maxAttempts}s.`,
        [
          lastError,
          '',
          'Recent postgres logs:',
          logs.ok ? logs.output : logs.output || 'could not fetch logs',
          '',
          `Try: docker compose -f ${DOCKER_COMPOSE_FILE} logs postgres`,
        ].join('\n'),
      );
    }

    await sleep(1000);
  }
}

function printPortReference(): void {
  log('');
  log('HIMS Platform — local dev stack');
  log('================================');
  log(`Log file: ${LOG_FILE}`);
  log(`Platform: ${process.platform} | cwd: ${WORKSPACE_ROOT}`);
  if (skipKill) warn('Flags: --skip-kill');
  if (skipDocker) warn('Flags: --skip-docker');
  if (skipWait) warn('Flags: --skip-wait');
  if (skipMigrate) warn('Flags: --skip-migrate');
  if (skipSeed) warn('Flags: --skip-seed');
  if (verbose) log('Flags: --verbose');
  log('');
  log('Ports that must be free (docs/dev/port-allocation.md):');
  for (const port of REQUIRED_PORTS) {
    log(`  ${portLabel(port)}`);
  }
  log(`  Optional: ${OPTIONAL_PORTS.join(', ')} (otel, pdf-platform — external)`);
  log('');
  log(`After start: ${HIMS_WEB_ORIGIN}  |  API: ${HIMS_BFF_ORIGIN}`);
  log(
    `Protected foreign ports (left untouched): ${PROTECTED_FOREIGN_PORTS.join(', ')}`,
  );
  log('');
}

async function verifyHostDatabaseConnection(): Promise<void> {
  step('Verifying host → Docker Postgres (port + credentials)');
  const url = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;
  const port = HIMS_DEV_PORTS.postgresHost;

  try {
    const pg = moduleRequire('pg') as typeof import('pg');
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    const result = await client.query<{ v: string }>('SELECT version() AS v');
    const version = result.rows[0]?.v ?? '';
    await client.end();

    if (!/PostgreSQL 1[56]/i.test(version)) {
      fail(
        `Port ${port} is not Docker Citus — another Postgres is answering on that host port.`,
        [
          `Connection URL: ${url}`,
          `Server version: ${version}`,
          '',
          'On Windows, multiple native postgres.exe instances often bind 5433–5437.',
          `Check listeners: netstat -ano | findstr ":${port}"`,
          'Only com.docker.backend.exe should own the HIMS postgres host port.',
        ].join('\n'),
      );
    }

    ok(`Host connects to Docker Postgres on port ${port}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(
      `Cannot connect to Postgres from host (port ${port}).`,
      [
        `Connection URL: ${url}`,
        '',
        'If you see "password authentication failed", localhost is likely hitting a native',
        'Windows Postgres instead of the hims-postgres container.',
        '',
        msg,
      ].join('\n'),
    );
  }
}

function runDatabaseMigrations(): void {
  step('Running database migrations (local Postgres)');
  // Same order as Makefile db-migrate (configurator twice after master-data).
  const migrationTargets = [
    'configurator:db-migrate',
    'user-management:db-migrate',
    'master-data:migrate',
    'configurator:db-migrate',
    'empi:db-migrate',
    'registration:db-migrate',
    'record-foundation:db-migrate',
    'opd:db-migrate',
    'billing:db-migrate',
    'pharmacy:db-migrate',
    'inventory:db-migrate',
    'integration-hub:db-migrate',
  ] as const;

  for (const target of migrationTargets) {
    log(`  nx run ${target}`);
    try {
      run(`npx nx run ${target}`, { stdio: 'inherit', label: `nx run ${target}` });
    } catch (err) {
      const detail =
        err instanceof CommandError
          ? [err.stderr, err.stdout].filter(Boolean).join('\n')
          : err instanceof Error
            ? err.message
            : String(err);
      fail(
        `Migration failed: ${target}. Check DATABASE_URL points at local Docker (localhost:${HIMS_DEV_PORTS.postgresHost}).`,
        detail,
      );
    }
  }

  ok('Database migrations completed');
}

async function verifyRemoteDatabaseReachable(): Promise<void> {
  step('Checking Azure shared database (VPN — first connect can take up to 60s)');
  const url = process.env.DATABASE_URL ?? '';
  const pg = moduleRequire('pg') as typeof import('pg');
  const maxAttempts = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      log(`Azure DB retry ${attempt}/${maxAttempts}…`);
      await sleep(3000);
    }
    try {
      const client = new pg.Client({
        connectionString: url,
        connectionTimeoutMillis: 60000,
      });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      ok(`Azure DATABASE_URL reachable${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      debug(`Azure connect attempt ${attempt} failed: ${lastError}`);
    }
  }

  fail(
    'Cannot connect to Azure DATABASE_URL after 3 attempts.',
    [
      'VPN may be on but Azure Private Link is slow or unstable from your network.',
      'Manual check: Test-NetConnection iqline-dev-shared-pg.postgres.database.azure.com -Port 6432',
      '',
      lastError,
    ].join('\n'),
  );
}

function runRemoteAuthMigrations(): void {
  step('Ensuring login schemas on shared DB (configurator + user-management)');
  const targets = ['configurator:db-migrate', 'user-management:db-migrate'] as const;
  for (const target of targets) {
    log(`  nx run ${target}`);
    try {
      run(`npx nx run ${target}`, { stdio: 'inherit', label: `nx run ${target}` });
    } catch (err) {
      const detail =
        err instanceof CommandError
          ? [err.stderr, err.stdout].filter(Boolean).join('\n')
          : err instanceof Error
            ? err.message
            : String(err);
      fail(`Auth migration failed: ${target}`, detail);
    }
  }
  ok('Login schemas ready (configurator + user_management)');
}

function runSeedIfNeeded(): void {
  if (skipSeed) {
    warn('--skip-seed: skipping development seed');
    return;
  }
  if (skipDocker) {
    warn('--skip-docker: skipping seed check (cannot query local Postgres reliably)');
    return;
  }
  if (isDatabaseSeeded()) {
    ok('Database already seeded — skipping pnpm seed');
    return;
  }
  runDevelopmentSeed();
}

async function autoStopPreviousDevServers(): Promise<void> {
  step('Fresh start — auto pnpm stop (kill previous HIMS dev servers)');
  const { killed, details } = stopHimsDevServers();
  for (const line of details) {
    log(`  ${line}`);
  }
  if (killed > 0) {
    ok(`Stopped ${killed} stale process(es) from previous pnpm start / pnpm dev`);
    await sleep(2000);
  } else {
    ok('No previous dev servers running — app ports already free');
  }
}

function pnpmCommand(): string {
  return 'pnpm';
}

function startNxDev(): Promise<void> {
  const devScript = fullStack ? 'dev' : 'dev:minimal';
  step(`Starting application services (pnpm ${devScript})`);
  if (!fullStack) {
    log('Minimal stack: login + OPD (web, bff, auth, configurator, master-data, registration, empi, billing, opd)');
    log('Full stack: pnpm start -- --full');
  }
  log('Press Ctrl+C to stop app services (Docker containers keep running)');
  log('Open: http://localhost:5180');
  log('');

  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn(pnpmCommand(), [devScript], {
      cwd: WORKSPACE_ROOT,
      stdio: 'inherit',
      env: applyLocalDevEnv({ ...process.env }),
      shell: isWin,
    });

    const onSigInt = (): void => {
      log('Received Ctrl+C — stopping pnpm dev…');
      child.kill('SIGINT');
    };
    const onSigTerm = (): void => {
      child.kill('SIGTERM');
    };

    process.on('SIGINT', onSigInt);
    process.on('SIGTERM', onSigTerm);

    child.on('error', (err) => {
      process.off('SIGINT', onSigInt);
      process.off('SIGTERM', onSigTerm);
      reject(new Error(`Failed to spawn pnpm dev: ${err.message}`));
    });

    child.on('exit', (code, signal) => {
      process.off('SIGINT', onSigInt);
      process.off('SIGTERM', onSigTerm);

      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      if (signal) {
        emit('WARN', `pnpm dev stopped by signal ${signal} after ${elapsed}s`);
      } else if (code === 0) {
        ok(`pnpm dev exited cleanly after ${elapsed}s`);
      } else {
        emit('ERROR', `pnpm dev exited with code ${code ?? 'unknown'} after ${elapsed}s`);
        emit('ERROR', 'Check the service output above for the failing project (EADDRINUSE, migration, uv, etc.)');
        emit('ERROR', `Log file: ${LOG_FILE}`);
      }
      resolve();
      process.exit(code ?? 1);
    });
  });
}

async function main(): Promise<void> {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  writeLogFile('');
  writeLogFile('='.repeat(72));
  emit('INFO', '=== New start-dev-stack run ===', false);
  emit('INFO', `=== New start-dev-stack run ===`);

  printPortReference();

  if (!skipKill) {
    await autoStopPreviousDevServers();
  } else {
    warn('--skip-kill: skipping auto pnpm stop (previous dev servers may still run)');
  }

  ensureEnvFile();
  ensureDevEnvironment();
  const localDockerDb = usesLocalDockerDatabase();
  const effectiveSkipMigrate = skipMigrate || !localDockerDb;
  const effectiveSkipSeed = skipSeed || !localDockerDb;
  const effectiveSkipPostgresWait = skipWait || !localDockerDb;
  checkPrerequisites();
  ensureNodeModules();
  ensurePythonModules();
  checkDockerRunning();

  if (!skipKill) {
    if (!skipDocker) {
      await stopDockerStackAsync();
    }
    await ensureAppPortsFreeOrFail();
  } else {
    warn('--skip-kill: not freeing ports');
  }

  if (!skipDocker) {
    startDockerInfra();
    if (!effectiveSkipPostgresWait) {
      await waitForPostgres();
      await verifyHostDatabaseConnection();
    } else if (!localDockerDb) {
      ok('Remote DB — skipping local Postgres health check');
    } else {
      warn('--skip-wait: not waiting for PostgreSQL');
    }
    if (!skipWait) {
      await waitForCerbos();
    } else {
      warn('--skip-wait: not waiting for Cerbos');
    }
  } else {
    warn('--skip-docker: assuming Cerbos already running (remote DB mode)');
  }

  if (!localDockerDb && !skipMigrate) {
    await verifyRemoteDatabaseReachable();
    runRemoteAuthMigrations();
  } else if (!effectiveSkipMigrate) {
    runDatabaseMigrations();
  } else if (!localDockerDb) {
    ok('Remote DB — skipped migrations (--skip-migrate)');
  } else {
    warn('--skip-migrate: skipping database migrations');
  }

  if (!effectiveSkipSeed) {
    runSeedIfNeeded();
  } else if (!localDockerDb) {
    ok('Remote DB — skipping seed (shared dev data)');
  } else {
    warn('--skip-seed: skipping development seed');
  }

  if (!skipKill) {
    await ensureAppPortsFreeOrFail();
  }

  ok('Bootstrap complete — launching application services');
  try {
    await startNxDev();
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

main().catch((err: unknown) => {
  if (err instanceof CommandError) {
    fail(err.message, [err.stderr, err.stdout].filter(Boolean).join('\n'));
  }
  fail(err instanceof Error ? err.message : String(err));
});
