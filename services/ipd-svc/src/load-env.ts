import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findRepoRoot(start: string): string | null {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
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

const repoRoot =
  findRepoRoot(serviceRoot) ?? findRepoRoot(process.cwd()) ?? path.resolve(serviceRoot, "../..");

for (const file of [".env", ".env.local"]) {
  loadEnvFile(path.join(repoRoot, file), false);
}
for (const file of [".env", ".env.local"]) {
  loadEnvFile(path.join(process.cwd(), file), true);
}
for (const file of [".env", ".env.local"]) {
  loadEnvFile(path.join(serviceRoot, file), true);
}
