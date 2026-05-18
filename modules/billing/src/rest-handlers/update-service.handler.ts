import type { FastifyInstance } from "fastify";
import type { TariffMasterRepo } from "../ports.js";
import type { UpdateTariffServiceInput } from "../domain/tariff-master.types.js";
import { updateTariffService } from "../use-cases/update-tariff-service.js";

const updateServiceBodySchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    service_name: { type: "string" },
    description: { type: ["string", "null"] },
    department: { type: ["string", "null"] },
    category: { type: ["string", "null"] },
    sub_category: { type: ["string", "null"] },
    tax_type: { type: ["string", "null"] },
    base_price: { type: ["string", "number"] },
    tax_percentage: { type: ["string", "number"] },
    is_active: { type: "boolean" },
    effective_from: { type: "string", format: "date-time" },
    effective_to: { type: ["string", "null"], format: "date-time" },
  },
} as const;

const STATUS_BY_CODE = { NOT_FOUND: 404, CONFLICT: 409, VALIDATION: 400 } as const;

export function registerUpdateServiceHandler(
  app: FastifyInstance,
  tariffRepo: TariffMasterRepo,
): void {
  app.patch<{ Params: { service_id: string }; Body: UpdateTariffServiceInput }>(
    "/services/:service_id",
    {
      config: { authMode: "protected" },
      schema: {
        params: {
          type: "object",
          required: ["service_id"],
          properties: { service_id: { type: "string", format: "uuid" } },
        },
        body: updateServiceBodySchema,
      },
    },
    async (request, reply) => {
      const result = await updateTariffService(
        { tariffRepo },
        request.tenantId,
        request.params.service_id,
        request.body,
      );

      if (!result.ok) {
        const status = STATUS_BY_CODE[result.code];
        return reply.code(status).send({
          statusCode: status,
          error: status === 404 ? "Not Found" : status === 409 ? "Conflict" : "Bad Request",
          message: result.message,
        });
      }

      return reply.send({ data: result.data });
    },
  );
}
