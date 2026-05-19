import { existsSync } from "node:fs";
import path from "node:path";

/** Walk up from `startDir` until `nx.json` + `pnpm-workspace.yaml` (monorepo root). */
export function resolveWorkspaceRoot(startDir: string): string {
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
