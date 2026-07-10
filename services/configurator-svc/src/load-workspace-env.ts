import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

/** Load `{workspaceRoot}/.env` when started via `tsx` (not only `nx run` with envFile). */
export function loadWorkspaceEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  // Ambient environment wins; .env supplies defaults only (dotenv never overrides by default).
  config({ path: resolve(here, "../../../.env") });
}
