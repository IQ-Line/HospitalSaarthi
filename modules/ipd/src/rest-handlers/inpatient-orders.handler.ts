/// <reference path="../fastify.d.ts" />
import type { FastifyInstance, FastifyReply } from "fastify";
import type { EpisodeRepo } from "../domain/episode.js";
import type { InpatientOrderRepo } from "../domain/inpatient-order.js";
import { mapUiStatusToDb, toInpatientOrderApi } from "../domain/inpatient-order.js";
import type { CreateInpatientOrderInput } from "../use-cases/create-inpatient-order.js";
import { createInpatientOrder } from "../use-cases/create-inpatient-order.js";
import { getInpatientOrder, listInpatientOrders } from "../use-cases/list-inpatient-orders.js";
import {
  createInpatientOrderBodySchema,
  listInpatientOrdersQuerySchema,
  paramsAdmissionIdSchema,
  paramsOrderIdSchema,
} from "./route-schemas.js";

const PUBLIC = { config: { authMode: "public" as const } };

const notFound = (reply: FastifyReply, message = "Not found") =>
  reply.code(404).send({ statusCode: 404, error: "Not Found", message });

type InpatientOrdersDeps = {
  episodeRepo: EpisodeRepo;
  inpatientOrderRepo: InpatientOrderRepo;
};

export function registerInpatientOrdersHandler(
  app: FastifyInstance,
  deps: InpatientOrdersDeps,
): void {
  app.get<{ Params: { admissionId: string }; Querystring: Record<string, string | undefined> }>(
    "/admissions/:admissionId/orders",
    {
      ...PUBLIC,
      schema: {
        params: paramsAdmissionIdSchema,
        querystring: listInpatientOrdersQuerySchema,
      },
    },
    async (req, reply) => {
      const q = req.query;
      const page = Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(q.limit ?? "20", 10) || 20));
      const statusRaw = q.status?.trim();
      const result = await listInpatientOrders(deps, req.tenantId, req.params.admissionId, {
        order_category: q.order_category as CreateInpatientOrderInput["order_category"] | undefined,
        priority: q.priority as CreateInpatientOrderInput["priority"] | undefined,
        status: statusRaw ? mapUiStatusToDb(statusRaw) : undefined,
        q: q.q,
        page,
        limit,
      });
      if (!result) return notFound(reply, "Episode not found");
      return reply.send({
        ...result,
        data: result.data.map(toInpatientOrderApi),
      });
    },
  );

  app.post<{ Params: { admissionId: string }; Body: CreateInpatientOrderInput }>(
    "/admissions/:admissionId/orders",
    {
      ...PUBLIC,
      schema: {
        params: paramsAdmissionIdSchema,
        body: createInpatientOrderBodySchema,
      },
    },
    async (req, reply) => {
      const key = (req.headers["idempotency-key"] as string | undefined)?.trim() || null;
      const created = await createInpatientOrder(
        deps,
        req.tenantId,
        req.params.admissionId,
        req.body,
        key,
      );
      if (!created) return notFound(reply, "Episode not found");
      return reply.code(201).send(toInpatientOrderApi(created));
    },
  );

  app.get<{ Params: { admissionId: string; orderId: string } }>(
    "/admissions/:admissionId/orders/:orderId",
    { ...PUBLIC, schema: { params: paramsOrderIdSchema } },
    async (req, reply) => {
      const order = await getInpatientOrder(
        deps,
        req.tenantId,
        req.params.admissionId,
        req.params.orderId,
      );
      if (!order) return notFound(reply);
      return reply.send(toInpatientOrderApi(order));
    },
  );
}
