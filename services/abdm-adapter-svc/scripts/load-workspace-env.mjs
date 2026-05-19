/**
 * Env precedence (later wins):
 *   repo `.env` → repo `.env.local` → deprecated service `.env` → service `.env.local`
 */
import { existsSync } from "node:fs";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const serviceRoot = path.resolve(scriptsDir, "..");

function resolveWorkspaceRoot(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (
      existsSync(path.join(dir, "nx.json")) &&
      existsSync(path.join(dir, "pnpm-workspace.yaml"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(startDir, "..");
}

export const workspaceRoot = resolveWorkspaceRoot(serviceRoot);

const ENV_FILES = [
  path.join(workspaceRoot, ".env"),
  path.join(workspaceRoot, ".env.local"),
  path.join(serviceRoot, ".env"),
  path.join(serviceRoot, ".env.local"),
];

export function loadWorkspaceEnv() {
  for (const file of ENV_FILES) {
    config({ path: file, override: true });
  }

  const adapterDb = process.env["ABDM_DATA_DATABASE_URL"]?.trim();
  const canonicalDb = process.env["DATABASE_URL"]?.trim();
  if (adapterDb && !canonicalDb) {
    process.env["DATABASE_URL"] = adapterDb;
  } else if (
    adapterDb &&
    canonicalDb &&
    (canonicalDb.includes("localhost") || canonicalDb.includes("127.0.0.1")) &&
    !adapterDb.includes("localhost") &&
    !adapterDb.includes("127.0.0.1")
  ) {
    process.env["DATABASE_URL"] = adapterDb;
  }
}
