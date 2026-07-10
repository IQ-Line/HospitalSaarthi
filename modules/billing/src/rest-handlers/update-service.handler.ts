import type { FastifyInstance } from "fastify";
import type { TariffMasterRepo } from "../ports.js";
import type { UpdateTariffServiceInput } from "../domain/tariff-master.types.js";
import { sendUseCaseResult } from "../lib/handler-result.js";
import { updateTariffService } from "../use-cases/update-tariff-service.js";
import { protectedRoute } from "../lib/fastify-helpers.js";

const bodySchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    service_name: { type: "string" },
    description: { type: ["string", "null"] },
    department_id: { type: ["string", "null"], format: "uuid" },
    category: { type: ["string", "null"] },
    sub_category: { type: ["string", "null"] },
    tax_type: { type: ["string", "null"] },
    base_price: { type: "number", minimum: 0 },
    tax_percentage: { type: "number", minimum: 0, maximum: 100 },
    is_active: { type: "boolean" },
    effective_from: { type: "string", format: "date-time" },
    effective_to: { type: ["string", "null"], format: "date-time" },
  },
} as const;

const updateServiceRouteSchema = {
  tags: ["billing"],
  params: {
    type: "object",
    required: ["service_id"],
    properties: { service_id: { type: "string", format: "uuid" } },
  },
  body: bodySchema,
} as const;

export function registerUpdateServiceHandler(
  app: FastifyInstance,
  tariffRepo: TariffMasterRepo,
): void {
  app.patch<{ Params: { service_id: string }; Body: UpdateTariffServiceInput }>(
    "/services/:service_id",
    {
      ...protectedRoute,
      schema: updateServiceRouteSchema,
    },
    async (request, reply) =>
      sendUseCaseResult(
        reply,
        await updateTariffService(
          { tariffRepo },
          request.tenantId,
          request.params.service_id,
          request.body,
        ),
      ),
  );
}
