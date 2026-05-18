export type SeedCounts = {
  modules: number;
  permissions: number;
  module_permissions: number;
  tenant_modules: number;
  capabilities: number;
  roles: number;
  users: number;
};

export function seedLog(phase: string, message: string, detail?: Record<string, unknown>): void {
  const payload = detail === undefined ? { phase, message } : { phase, message, ...detail };
  console.log(JSON.stringify({ level: "info", ...payload }));
}

export function seedError(phase: string, message: string, detail?: Record<string, unknown>): never {
  const payload = detail === undefined ? { phase, message } : { phase, message, ...detail };
  console.error(JSON.stringify({ level: "error", ...payload }));
  throw new Error(`[seed] ${phase}: ${message}`);
}

export function printSummary(counts: SeedCounts): void {
  console.log(`[seed] modules: ${counts.modules}`);
  console.log(`[seed] permissions: ${counts.permissions}`);
  console.log(`[seed] module_permissions: ${counts.module_permissions}`);
  console.log(`[seed] tenant_modules: ${counts.tenant_modules}`);
  console.log(`[seed] capabilities: ${counts.capabilities}`);
  console.log(`[seed] roles: ${counts.roles}`);
  console.log(`[seed] users: ${counts.users}`);
}
