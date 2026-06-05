import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

/** Platform-wide keys — workspace root `.env` or pre-injected deploy env only; never service-local `.env`. */
export const ROOT_ONLY_ENV_KEYS = [
  "PDF_PLATFORM_URL",
  "PDF_PLATFORM_API_KEY",
  "REPORT_WEB_ORIGIN",
  "REPORT_LOGO_URL",
] as const;

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Walk up from `start` until `pnpm-workspace.yaml` (monorepo root). */
function findRepoRoot(start: string): string | null {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadEnvFile(filePath: string, override: boolean): void {
  if (!existsSync(filePath)) return;
  config({ path: filePath, override });
}

function snapshotEnvKeys(keys: readonly string[]): Map<string, string> {
  const snapshot = new Map<string, string>();
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined) {
      snapshot.set(key, value);
    }
  }
  return snapshot;
}

function restoreEnvKeys(snapshot: Map<string, string>): void {
  for (const key of ROOT_ONLY_ENV_KEYS) {
    if (snapshot.has(key)) {
      process.env[key] = snapshot.get(key);
    } else {
      delete process.env[key];
    }
  }
}

const explicitEnvFile = process.env["HIMS_ENV_FILE"]?.trim();
if (explicitEnvFile) {
  loadEnvFile(explicitEnvFile, false);
}

const repoRoot =
  findRepoRoot(serviceRoot) ?? findRepoRoot(process.cwd()) ?? path.resolve(serviceRoot, "../..");

// Values injected before boot (K8s ConfigMap/Secret, `HIMS_ENV_FILE`, etc.) win over file layers.
const preInjectedRootOnly = snapshotEnvKeys(ROOT_ONLY_ENV_KEYS);

// Workspace root `.env` (single source of truth for local dev and shared platform config).
for (const file of [".env", ".env.local"]) {
  loadEnvFile(path.join(repoRoot, file), false);
}

const rootOnlyFromRepo = snapshotEnvKeys(ROOT_ONLY_ENV_KEYS);

// Docker / K8s: image cwd is often `/app` with a mounted or copied `.env` (no monorepo tree).
for (const file of [".env", ".env.local"]) {
  loadEnvFile(path.join(process.cwd(), file), true);
}

// Optional per-service overrides (service-specific ports, URLs, etc.).
for (const file of [".env", ".env.local"]) {
  loadEnvFile(path.join(serviceRoot, file), true);
}

// PDF/report config must not be overridden by service-local `.env`.
restoreEnvKeys(preInjectedRootOnly.size > 0 ? preInjectedRootOnly : rootOnlyFromRepo);
