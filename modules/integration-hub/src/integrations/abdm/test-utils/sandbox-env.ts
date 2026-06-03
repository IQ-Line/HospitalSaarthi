/** True when `DATABASE_URL` looks like a real Postgres URI (not a placeholder). */
export function isValidPostgresUrl(url: string | undefined): url is string {
  if (!url || url.trim() === "" || url === "...") return false;
  return /^postgres(?:ql)?(?:\+[\w]+)?:\/\//.test(url.trim());
}

export function resolveSandboxDatabaseUrl(): string | null {
  const url =
    process.env["DATABASE_URL"]?.trim() ??
    process.env["ABDM_DATA_DATABASE_URL"]?.trim();
  return isValidPostgresUrl(url) ? url : null;
}

export function hasSandboxAadhaarEnv(): boolean {
  return /^\d{12}$/.test(process.env["ABDM_SANDBOX_TEST_AADHAAR"] ?? "");
}

/** Opt-in for tests that POST to real NHA sandbox (not mock gateway). */
export function hasLiveNhaSandboxEnv(): boolean {
  return process.env["ABDM_RUN_LIVE_NHA_SANDBOX"] === "1";
}
