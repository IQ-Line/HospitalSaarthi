import type { FastifyInstance } from "fastify";
import type { ConsultationTariffDeps } from "../ports.js";
import { sendUseCaseResult } from "../lib/handler-result.js";
import { protectedRoute } from "../lib/fastify-helpers.js";
import { bulkUpsertProviderConsultationTariffs } from "../use-cases/bulk-upsert-provider-consultation-tariffs.js";
import { listConsultationTypes } from "../use-cases/list-consultation-types.js";
import { listProviderConsultationTariffs } from "../use-cases/list-provider-consultation-tariffs.js";
import {
  bulkUpsertProviderConsultationTariffsRouteSchema,
  listConsultationTypesRouteSchema,
  listProviderConsultationTariffsRouteSchema,
} from "./provider-consultation-tariffs-schemas.js";

type ListQuery = {
  provider_id?: string;
  department_id?: string;
  consultation_type_id?: string;
};

export function registerProviderConsultationTariffHandlers(
  app: FastifyInstance,
  deps: ConsultationTariffDeps,
): void {
  app.get(
    "/consultation-types",
    { ...protectedRoute, schema: listConsultationTypesRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(reply, await listConsultationTypes(deps, req.tenantId)),
  );

  app.post(
    "/provider-consultation-tariffs/bulk-upsert",
    { ...protectedRoute, schema: bulkUpsertProviderConsultationTariffsRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(
        reply,
        await bulkUpsertProviderConsultationTariffs(deps, req.tenantId, req.body),
      ),
  );

  app.get<{ Querystring: ListQuery }>(
    "/provider-consultation-tariffs",
    { ...protectedRoute, schema: listProviderConsultationTariffsRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(
        reply,
        await listProviderConsultationTariffs(deps, req.tenantId, req.query),
      ),
  );
}
