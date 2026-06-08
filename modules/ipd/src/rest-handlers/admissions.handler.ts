/// <reference path="../fastify.d.ts" />
import type { FastifyInstance, FastifyReply } from "fastify";
import type { EpisodeRepo } from "../domain/episode.js";
import { toApi } from "../domain/episode.js";
import type { CreateAdmissionInput } from "../use-cases/create-admission.js";
import { createAdmission } from "../use-cases/create-admission.js";
import { updateAdmission } from "../use-cases/update-admission.js";
import {
  createAdmissionBodySchema,
  listAdmissionsQuerySchema,
  paramsAdmissionIdSchema,
  updateAdmissionBodySchema,
} from "./route-schemas.js";

const PUBLIC = { config: { authMode: "public" as const } };

const DEFAULT_QUEUE_STATUSES = ["scheduled", "admitted"];

const notFound = (reply: FastifyReply) =>
  reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Episode not found" });

const conflict = (reply: FastifyReply, message: string) =>
  reply.code(409).send({ statusCode: 409, error: "Conflict", message });

export function registerAdmissionsHandler(
  app: FastifyInstance,
  repo: EpisodeRepo,
): void {
  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/admissions",
    { ...PUBLIC, schema: { querystring: listAdmissionsQuerySchema } },
    async (req, reply) => {
      const q = req.query;
      const status = q.status?.trim()
        ? q.status.split(",").map((s) => s.trim())
        : DEFAULT_QUEUE_STATUSES;
      const page = Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(q.limit ?? "20", 10) || 20));
      const result = await repo.list(req.tenantId, {
        status,
        admission_source: q.admission_source,
        admission_type: q.admission_type,
        ward_id: q.ward_id,
        q: q.q,
        page,
        limit,
      });
      return reply.send({ ...result, data: result.data.map(toApi) });
    },
  );

  app.post<{ Body: CreateAdmissionInput }>(
    "/admissions",
    { ...PUBLIC, schema: { body: createAdmissionBodySchema } },
    async (req, reply) => {
      const key = (req.headers["idempotency-key"] as string | undefined)?.trim() || null;
      if (key) {
        const existing = await repo.getByIdempotencyKey(req.tenantId, key);
        if (existing) return reply.code(201).send(toApi(existing));
      }
      const created = await createAdmission(
        { episodeRepo: repo },
        req.tenantId,
        req.body,
        key,
      );
      return reply.code(201).send(toApi(created));
    },
  );

  app.get<{ Params: { admissionId: string } }>(
    "/admissions/:admissionId",
    { ...PUBLIC, schema: { params: paramsAdmissionIdSchema } },
    async (req, reply) => {
      const row = await repo.getById(req.tenantId, req.params.admissionId);
      return row ? reply.send(toApi(row)) : notFound(reply);
    },
  );

  app.patch<{ Params: { admissionId: string }; Body: Record<string, unknown> }>(
    "/admissions/:admissionId",
    {
      ...PUBLIC,
      schema: { params: paramsAdmissionIdSchema, body: updateAdmissionBodySchema },
    },
    async (req, reply) => {
      try {
        const updated = await updateAdmission(
          { episodeRepo: repo },
          req.tenantId,
          req.params.admissionId,
          req.body ?? {},
        );
        if (!updated) return notFound(reply);
        return reply.send(toApi(updated));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Conflict";
        return conflict(reply, message);
      }
    },
  );
}
