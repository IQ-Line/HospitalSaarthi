import type { FastifyInstance } from "fastify";
import type { DbInstance } from "@hims/ts-sdk-db";
import { createInboundRouter, loadPartnerJwtSignerFromEnv } from "@hims/integration-hub";

export type RegisterInboundOptions = {
  db: DbInstance;
  registrationBaseUrl: string;
  empiBaseUrl: string;
  configuratorBaseUrl: string;
  masterDataBaseUrl: string;
};

export async function registerInbound(
  app: FastifyInstance,
  options: RegisterInboundOptions,
): Promise<void> {
  const partnerJwt = await loadPartnerJwtSignerFromEnv();
  const inboundRouter = createInboundRouter({
    db: options.db,
    registrationBaseUrl: options.registrationBaseUrl,
    empiBaseUrl: options.empiBaseUrl,
    configuratorBaseUrl: options.configuratorBaseUrl,
    masterDataBaseUrl: options.masterDataBaseUrl,
    partnerJwt,
  });

  await app.register(inboundRouter, { prefix: "/api/integration-hub/v1" });
}
