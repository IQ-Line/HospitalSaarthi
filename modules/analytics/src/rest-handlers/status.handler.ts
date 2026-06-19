import type { FastifyInstance } from "fastify";
import { ANALYTICS_MODULE_KEY, type AnalyticsModuleStatus } from "../domain/analytics.types.js";

export function registerStatusHandler(app: FastifyInstance): void {
  app.get(
    "/status",
    { config: { authMode: "public" } },
    async (): Promise<AnalyticsModuleStatus> => ({
      status: "ok",
      module: ANALYTICS_MODULE_KEY,
    }),
  );
}
