import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import { GrnValidationError } from "../errors.js";
import { validateGrnDocumentKind } from "../lib/grn-document-validation.js";
import { getAzureBlobSettings, isAzureBlobStorageConfigured } from "../lib/azure-blob-config.js";
import type { IndentRepo, StoreRepo } from "../ports.js";
import { createGrn } from "../use-cases/create-grn.js";
import { getGrnDocument } from "../use-cases/get-grn-document.js";
import { getGrn } from "../use-cases/get-grn.js";
import { listGrns } from "../use-cases/list-grns.js";
import { replaceGrnLines } from "../use-cases/replace-grn-lines.js";
import { submitGrn } from "../use-cases/submit-grn.js";
import { updateGrn } from "../use-cases/update-grn.js";
import { uploadGrnDocument } from "../use-cases/upload-grn-document.js";
import {
  createGrnBodySchema,
  listGrnsQuerySchema,
  replaceGrnLinesBodySchema,
  updateGrnBodySchema,
} from "./grn.schemas.js";

type GrnHandlerDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
  storeRepo: StoreRepo;
  itemRepo: DrizzleInventoryItemRepository;
  indentRepo: IndentRepo;
};

function actorIdFromRequest(request: { user?: { userId?: string; id?: string; sub?: string } }): string | null {
  const id = request.user?.userId ?? request.user?.id ?? request.user?.sub;
  return typeof id === "string" && id.length > 0 ? id : null;
}

async function readMultipartFile(file: MultipartFile): Promise<{
  bytes: Buffer;
  filename: string;
  mimeType: string;
}> {
  const chunks: Buffer[] = [];
  for await (const chunk of file.file) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return {
    bytes: Buffer.concat(chunks),
    filename: file.filename,
    mimeType: file.mimetype,
  };
}

export function registerGrnHandlers(app: FastifyInstance, deps: GrnHandlerDeps): void {
  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/grns",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const query = listGrnsQuerySchema.parse(request.query);
      const data = await listGrns({ grnRepo: deps.grnRepo }, request.tenantId, query);
      return reply.send(data);
    },
  );

  app.post<{ Body: unknown }>(
    "/grns",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const body = createGrnBodySchema.parse(request.body);
      const data = await createGrn(
        { grnRepo: deps.grnRepo, storeRepo: deps.storeRepo, itemRepo: deps.itemRepo, indentRepo: deps.indentRepo },
        request.tenantId,
        body,
        actorIdFromRequest(request),
      );
      return reply.status(201).send({ data });
    },
  );

  app.get<{ Params: { grnId: string } }>(
    "/grns/:grnId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const data = await getGrn(
        { grnRepo: deps.grnRepo, indentRepo: deps.indentRepo },
        request.tenantId,
        request.params.grnId,
      );
      return reply.send({ data });
    },
  );

  app.patch<{ Params: { grnId: string }; Body: unknown }>(
    "/grns/:grnId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const body = updateGrnBodySchema.parse(request.body);
      const data = await updateGrn(
        { grnRepo: deps.grnRepo, storeRepo: deps.storeRepo, indentRepo: deps.indentRepo },
        request.tenantId,
        request.params.grnId,
        body,
      );
      return reply.send({ data });
    },
  );

  app.put<{ Params: { grnId: string }; Body: unknown }>(
    "/grns/:grnId/lines",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const body = replaceGrnLinesBodySchema.parse(request.body);
      await replaceGrnLines(
        { grnRepo: deps.grnRepo, itemRepo: deps.itemRepo },
        request.tenantId,
        request.params.grnId,
        body.lines,
      );
      const data = await getGrn(
        { grnRepo: deps.grnRepo, indentRepo: deps.indentRepo },
        request.tenantId,
        request.params.grnId,
      );
      return reply.send({ data });
    },
  );

  app.post<{ Params: { grnId: string } }>(
    "/grns/:grnId/submit",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const data = await submitGrn(
        { grnRepo: deps.grnRepo, itemRepo: deps.itemRepo, indentRepo: deps.indentRepo },
        request.tenantId,
        request.params.grnId,
        actorIdFromRequest(request),
      );
      return reply.send({ data });
    },
  );

  app.post<{ Params: { grnId: string; kind: string } }>(
    "/grns/:grnId/documents/:kind",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const kind = validateGrnDocumentKind(request.params.kind);
      const part = await request.file();
      if (!part) {
        throw new GrnValidationError("file is required");
      }
      const file = await readMultipartFile(part);
      const data = await uploadGrnDocument(
        { grnRepo: deps.grnRepo },
        request.tenantId,
        request.params.grnId,
        kind,
        file,
      );
      return reply.status(201).send({ data });
    },
  );

  app.get<{ Params: { grnId: string; kind: string } }>(
    "/grns/:grnId/documents/:kind",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const kind = validateGrnDocumentKind(request.params.kind);
      const { bytes, contentType } = await getGrnDocument(
        { grnRepo: deps.grnRepo },
        request.tenantId,
        request.params.grnId,
        kind,
      );
      return reply
        .header("Content-Type", contentType)
        .header("Cache-Control", "private, max-age=60")
        .send(bytes);
    },
  );

  if (isAzureBlobStorageConfigured()) {
    app.log.info(
      { container: getAzureBlobSettings().containerName },
      "GRN document uploads use Azure Blob Storage",
    );
  } else {
    app.log.warn(
      "AZURE_STORAGE_CONNECTION_STRING unset — GRN document upload/download will return 503",
    );
  }
}
