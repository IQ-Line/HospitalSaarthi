import type { FastifyBaseLogger } from "fastify";
import type { IntegrationHubSharedInfra } from "../lib/build-abdm-deps.js";

export interface RunIntegrationHubJanitorOptions {
  sharedInfra: IntegrationHubSharedInfra;
  log: FastifyBaseLogger;
}

/** Expires stale link tokens, M3 transfers, and consent requests. */
export async function runIntegrationHubJanitor(
  options: RunIntegrationHubJanitorOptions,
): Promise<void> {
  const { sharedInfra, log } = options;
  const linkExpired = await sharedInfra.linkTokens.janitor();
  const transferExpired = await sharedInfra.m3DataTransfers.janitor();
  const consentExpired = await sharedInfra.m3ConsentRequests.janitor();
  if (linkExpired || transferExpired || consentExpired) {
    log.info({ linkExpired, transferExpired, consentExpired }, "integration hub janitor sweep");
  }
}

export function scheduleIntegrationHubJanitor(
  options: RunIntegrationHubJanitorOptions & { intervalMs: number },
): NodeJS.Timeout | null {
  const { intervalMs, ...runOptions } = options;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return null;
  }

  const timer = setInterval(() => {
    runIntegrationHubJanitor(runOptions).catch((err) => {
      runOptions.log.error(err, "integration hub janitor sweep failed");
    });
  }, intervalMs);
  timer.unref?.();
  return timer;
}
