/// <reference path="../fastify.d.ts" />
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { EpisodeRepo } from "../domain/episode.js";
import type { ClinicalNoteRepo } from "../domain/clinical-note.js";
import { toClinicalNoteApi } from "../domain/clinical-note.js";
import type { CreateClinicalNoteInput } from "../use-cases/create-clinical-note.js";
import { createClinicalNote } from "../use-cases/create-clinical-note.js";
import { finalizeClinicalNote } from "../use-cases/finalize-clinical-note.js";
import { getClinicalNote, listClinicalNotes } from "../use-cases/list-clinical-notes.js";
import { updateClinicalNoteDraft } from "../use-cases/update-clinical-note-draft.js";
import {
  createClinicalNoteBodySchema,
  listClinicalNotesQuerySchema,
  paramsAdmissionIdSchema,
  paramsClinicalNoteIdSchema,
  updateClinicalNoteBodySchema,
} from "./route-schemas.js";

const PUBLIC = { config: { authMode: "public" as const } };

const IPD_DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

function resolveAuthorId(req: FastifyRequest): string {
  if (req.user?.id) return req.user.id;
  const header = req.headers["x-user-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return IPD_DEV_USER_ID;
}

const notFound = (reply: FastifyReply, message = "Not found") =>
  reply.code(404).send({ statusCode: 404, error: "Not Found", message });

const forbidden = (reply: FastifyReply, message = "Forbidden") =>
  reply.code(403).send({ statusCode: 403, error: "Forbidden", message });

type ClinicalNotesDeps = {
  episodeRepo: EpisodeRepo;
  clinicalNoteRepo: ClinicalNoteRepo;
};

export function registerClinicalNotesHandler(
  app: FastifyInstance,
  deps: ClinicalNotesDeps,
): void {
  app.get<{ Params: { admissionId: string }; Querystring: Record<string, string | undefined> }>(
    "/admissions/:admissionId/clinical-notes",
    {
      ...PUBLIC,
      schema: {
        params: paramsAdmissionIdSchema,
        querystring: listClinicalNotesQuerySchema,
      },
    },
    async (req, reply) => {
      const q = req.query;
      const notes = await listClinicalNotes(
        deps,
        req.tenantId,
        req.params.admissionId,
        {
          status: q.status as "draft" | "finalized" | "signed" | undefined,
          note_type: q.note_type as CreateClinicalNoteInput["note_type"] | undefined,
        },
      );
      if (notes === null) return notFound(reply, "Episode not found");
      return reply.send({ data: notes.map(toClinicalNoteApi) });
    },
  );

  app.post<{ Params: { admissionId: string }; Body: CreateClinicalNoteInput }>(
    "/admissions/:admissionId/clinical-notes",
    {
      ...PUBLIC,
      schema: {
        params: paramsAdmissionIdSchema,
        body: createClinicalNoteBodySchema,
      },
    },
    async (req, reply) => {
      const created = await createClinicalNote(
        deps,
        req.tenantId,
        req.params.admissionId,
        resolveAuthorId(req),
        req.body,
      );
      if (!created) return notFound(reply, "Episode not found");
      return reply.code(201).send(toClinicalNoteApi(created));
    },
  );

  app.get<{ Params: { admissionId: string; noteId: string } }>(
    "/admissions/:admissionId/clinical-notes/:noteId",
    { ...PUBLIC, schema: { params: paramsClinicalNoteIdSchema } },
    async (req, reply) => {
      const note = await getClinicalNote(
        deps,
        req.tenantId,
        req.params.admissionId,
        req.params.noteId,
      );
      if (!note) return notFound(reply);
      return reply.send(toClinicalNoteApi(note));
    },
  );

  app.patch<{
    Params: { admissionId: string; noteId: string };
    Body: Record<string, unknown>;
  }>(
    "/admissions/:admissionId/clinical-notes/:noteId",
    {
      ...PUBLIC,
      schema: {
        params: paramsClinicalNoteIdSchema,
        body: updateClinicalNoteBodySchema,
      },
    },
    async (req, reply) => {
      const result = await updateClinicalNoteDraft(
        deps,
        req.tenantId,
        req.params.admissionId,
        req.params.noteId,
        resolveAuthorId(req),
        req.body ?? {},
      );
      if (!result.ok) {
        if (result.reason === "forbidden") {
          return forbidden(reply, "Only the author can edit a draft note");
        }
        return notFound(reply);
      }
      return reply.send(toClinicalNoteApi(result.note));
    },
  );

  app.post<{ Params: { admissionId: string; noteId: string } }>(
    "/admissions/:admissionId/clinical-notes/:noteId/finalize",
    { ...PUBLIC, schema: { params: paramsClinicalNoteIdSchema } },
    async (req, reply) => {
      const result = await finalizeClinicalNote(
        deps,
        req.tenantId,
        req.params.admissionId,
        req.params.noteId,
        resolveAuthorId(req),
      );
      if (!result.ok) {
        if (result.reason === "forbidden") {
          return forbidden(reply, "Only the author can finalize a draft note");
        }
        return notFound(reply);
      }
      return reply.send(toClinicalNoteApi(result.note));
    },
  );
}
