import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string, override: boolean): void {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
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

/** Root `.env` first; service `.env` may override integration-hub-specific values. */
export function loadMigrationEnv(workspaceRoot: string): void {
  loadEnvFile(resolve(workspaceRoot, ".env"), false);
  loadEnvFile(resolve(workspaceRoot, "services/integration-hub-svc/.env"), true);
}
