import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DbInstance } from "@hims/ts-sdk-db";
import { registerStatusHandler } from "./rest-handlers/status.handler.js";
import { registerOpdRegistrationBillingReportHandler } from "./rest-handlers/opd-registration-billing-report.handler.js";

export interface AnalyticsRouterOptions {
  db: DbInstance;
}

async function analyticsRouter(
  app: FastifyInstance,
  options: AnalyticsRouterOptions,
): Promise<void> {
  registerStatusHandler(app);
  registerOpdRegistrationBillingReportHandler(app, { db: options.db });
}

export function createRouter(options: AnalyticsRouterOptions) {
  return fp(
    async (app: FastifyInstance) => analyticsRouter(app, options),
    { fastify: "5.x", name: "@hims/analytics" },
  );
}
