/**
 * Load repo-root `.env` / `.env.local` (used by migrate and cleanup scripts).
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const serviceRoot = path.resolve(scriptsDir, "..");
export const workspaceRoot = path.resolve(serviceRoot, "../..");

export function loadWorkspaceEnv() {
  for (const file of [
    path.join(workspaceRoot, ".env"),
    path.join(workspaceRoot, ".env.local"),
  ]) {
    config({ path: file, override: true });
  }
}
