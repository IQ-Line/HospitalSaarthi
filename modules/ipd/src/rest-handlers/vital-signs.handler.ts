/// <reference path="../fastify.d.ts" />
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { EpisodeRepo } from "../domain/episode.js";
import type { VitalSignRepo } from "../domain/vital-sign.js";
import { toVitalCheckInApi } from "../domain/vital-sign.js";
import type { RecordVitalCheckInInput } from "../use-cases/record-vital-check-in.js";
import { listVitalCheckIns, recordVitalCheckIn } from "../use-cases/record-vital-check-in.js";
import {
  listVitalCheckInsQuerySchema,
  paramsAdmissionIdSchema,
  recordVitalCheckInBodySchema,
} from "./route-schemas.js";

const PUBLIC = { config: { authMode: "public" as const } };

const IPD_DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

function resolveRecordedBy(req: FastifyRequest): string {
  if (req.user?.id) return req.user.id;
  const header = req.headers["x-user-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return IPD_DEV_USER_ID;
}

const notFound = (reply: FastifyReply, message = "Not found") =>
  reply.code(404).send({ statusCode: 404, error: "Not Found", message });

const badRequest = (reply: FastifyReply, message: string) =>
  reply.code(400).send({ statusCode: 400, error: "Bad Request", message });

type VitalSignsDeps = {
  episodeRepo: EpisodeRepo;
  vitalSignRepo: VitalSignRepo;
};

export function registerVitalSignsHandler(app: FastifyInstance, deps: VitalSignsDeps): void {
  app.get<{ Params: { admissionId: string }; Querystring: Record<string, string | undefined> }>(
    "/admissions/:admissionId/vital-check-ins",
    {
      ...PUBLIC,
      schema: {
        params: paramsAdmissionIdSchema,
        querystring: listVitalCheckInsQuerySchema,
      },
    },
    async (req, reply) => {
      const role = req.query.recorder_role as RecordVitalCheckInInput["recorder_role"] | undefined;
      const checkIns = await listVitalCheckIns(deps, req.tenantId, req.params.admissionId, role);
      if (checkIns === null) return notFound(reply, "Episode not found");
      return reply.send({ data: checkIns.map(toVitalCheckInApi) });
    },
  );

  app.post<{ Params: { admissionId: string }; Body: RecordVitalCheckInInput }>(
    "/admissions/:admissionId/vital-check-ins",
    {
      ...PUBLIC,
      schema: {
        params: paramsAdmissionIdSchema,
        body: recordVitalCheckInBodySchema,
      },
    },
    async (req, reply) => {
      const result = await recordVitalCheckIn(
        deps,
        req.tenantId,
        req.params.admissionId,
        resolveRecordedBy(req),
        req.body,
      );
      if (result === "empty") {
        return badRequest(reply, "Enter at least one vital sign");
      }
      if (result === null) return notFound(reply, "Episode not found");
      return reply.code(201).send(toVitalCheckInApi(result));
    },
  );
}
