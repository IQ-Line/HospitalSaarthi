import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

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

const explicitEnvFile = process.env["HIMS_ENV_FILE"]?.trim();
if (explicitEnvFile) {
  loadEnvFile(explicitEnvFile, false);
}

const repoRoot =
  findRepoRoot(serviceRoot) ?? findRepoRoot(process.cwd()) ?? path.resolve(serviceRoot, "../..");

// Workspace root `.env` (single source of truth for local dev).
for (const file of [".env", ".env.local"]) {
  loadEnvFile(path.join(repoRoot, file), false);
}

// Docker / K8s: image cwd is often `/app` with a mounted or copied `.env` (no monorepo tree).
for (const file of [".env", ".env.local"]) {
  loadEnvFile(path.join(process.cwd(), file), true);
}

// Optional per-service overrides (omit if you use root `.env` only).
for (const file of [".env", ".env.local"]) {
  loadEnvFile(path.join(serviceRoot, file), true);
}
