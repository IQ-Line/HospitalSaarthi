import type { FastifyInstance, FastifyReply } from "fastify";
import { getAbdmDeps } from "../../../../lib/get-abdm-deps.js";
import { startConsentRequest } from "../../use-cases/m3/hiu/start-consent-request.js";
import { startDataRequest } from "../../use-cases/m3/hiu/start-data-request.js";
import type { SearchConsentRequestsInput } from "../../use-cases/m3/hiu/search-consent-requests.js";
import type { PurposeCode } from "@hims/ts-sdk-abha/protocol/m3";
import type { HiTypePascal } from "@hims/ts-sdk-abha/protocol/m3";
import { isM3MockGateway } from "../../lib/m3-runtime-env.js";
import {
  AbdmGatewayError,
  formatNhaUpstreamMessage,
  parseNhaErrorBody,
} from "../../lib/gateway-errors.js";
import {
  m3SessionIdParamSchema,
  m3TransferIdParamSchema,
  m3AttachmentParamsSchema,
  searchConsentRequestsQuerySchema,
  consentArtefactRecordsQuerySchema,
  startConsentRequestBodySchema,
  startDataRequestBodySchema,
} from "./m3-route-schemas.js";
import { searchConsentRequests } from "../../use-cases/m3/hiu/search-consent-requests.js";
import { getM3Attachment } from "../../use-cases/m3/hiu/get-m3-attachment.js";
import { getConsentArtefactRecords } from "../../use-cases/m3/hiu/get-consent-artefact-records.js";

function hasTransferBundle(bundleJson: Record<string, unknown> | null | undefined): boolean {
  if (!bundleJson || typeof bundleJson !== "object") return false;
  const entries = bundleJson["entries"];
  return Array.isArray(entries) && entries.length > 0;
}

function sendGatewayError(reply: FastifyReply, err: AbdmGatewayError): unknown {
  const status =
    err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 502;
  const parsed = parseNhaErrorBody(err.responseBody);
  return reply.status(status).send({
    error: "Upstream",
    message: formatNhaUpstreamMessage(err),
    code: err.abdmCode ?? parsed.code ?? null,
    ...(process.env["NODE_ENV"] !== "production" && err.responseBody !== undefined
      ? { details: err.responseBody }
      : {}),
  });
}

export async function registerM3PlatformRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/m3/hiu/consent/requests",
    { config: { authMode: "protected" as const }, schema: { querystring: searchConsentRequestsQuerySchema } },
    async (req, reply) => {
      const iqTenantId = req.tenantId?.trim() ?? "";
      if (!iqTenantId) {
        return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
      }
      const q = req.query as SearchConsentRequestsInput;
      const result = await searchConsentRequests({ iqTenantId, ...q }, getAbdmDeps(req));
      return reply.status(200).send(result);
    },
  );

  app.post(
    "/m3/hiu/consent/request",
    { config: { authMode: "protected" as const }, schema: { body: startConsentRequestBodySchema } },
    async (req, reply) => {
    const iqTenantId = req.tenantId?.trim() ?? "";
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const body = req.body as {
      patientAbhaAddress: string;
      patientName?: string;
      patientAbhaNumber?: string;
      hipId?: string;
      purpose: PurposeCode;
      hiTypes: HiTypePascal[];
      dateRange: { from: string; to: string };
      dataEraseAt?: string;
      requesterName?: string;
      requesterRegNo?: string;
    };
    try {
      const result = await startConsentRequest({ iqTenantId, ...body }, getAbdmDeps(req));
      return reply.status(202).send(result);
    } catch (e) {
      if (e instanceof AbdmGatewayError) return sendGatewayError(reply, e);
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(400).send({ error: "BadRequest", message });
    }
  },
  );

  app.get(
    "/m3/hiu/consent/request/:sessionId",
    { config: { authMode: "protected" as const }, schema: { params: m3SessionIdParamSchema } },
    async (req, reply) => {
    const iqTenantId = req.tenantId?.trim() ?? "";
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const sessionId = (req.params as { sessionId: string }).sessionId;
    const session = await getAbdmDeps(req).sessions.findById({ iqTenantId, sessionId });
    if (!session || session.flowKind !== "abdm.m3.hiu.v1") {
      return reply.status(404).send({ error: "NotFound" });
    }
    const row = await getAbdmDeps(req).m3ConsentRequests.findBySessionId({ iqTenantId, sessionId });
    return reply.status(200).send({
      sessionId: session.sessionId,
      state: session.state,
      consentRequestId:
        session.context.consentRequestId ?? row?.consentRequestId,
      consentArtefactIds:
        session.context.consentArtefactIds ?? row?.consentArtefactIds,
      error: session.context.error,
    });
  },
  );

  app.get(
    "/m3/hiu/consent/request/:sessionId/records",
    {
      config: { authMode: "protected" as const },
      schema: {
        params: m3SessionIdParamSchema,
        querystring: consentArtefactRecordsQuerySchema,
      },
    },
    async (req, reply) => {
      const iqTenantId = req.tenantId?.trim() ?? "";
      if (!iqTenantId) {
        return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
      }
      const sessionId = (req.params as { sessionId: string }).sessionId;
      const consentId = (req.query as { consentId?: string }).consentId;
      const result = await getConsentArtefactRecords(
        { iqTenantId, sessionId, consentId },
        getAbdmDeps(req),
      );
      if (!result) {
        return reply.status(404).send({ error: "NotFound" });
      }
      return reply.status(200).send(result);
    },
  );

  app.post(
    "/m3/hiu/data-request",
    { config: { authMode: "protected" as const }, schema: { body: startDataRequestBodySchema } },
    async (req, reply) => {
    const iqTenantId = req.tenantId?.trim() ?? "";
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const body = req.body as { consentId: string };
    try {
      const result = await startDataRequest(
        { iqTenantId, consentId: body.consentId },
        getAbdmDeps(req),
      );
      return reply.status(202).send(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const status = message.includes("not found") ? 404 : 400;
      return reply.status(status).send({ error: "BadRequest", message });
    }
  },
  );

  app.get(
    "/m3/hiu/transfers/:transferId",
    { config: { authMode: "protected" as const }, schema: { params: m3TransferIdParamSchema } },
    async (req, reply) => {
    const iqTenantId = req.tenantId?.trim() ?? "";
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const transferId = (req.params as { transferId: string }).transferId;
    const transfer = await getAbdmDeps(req).m3DataTransfers.findById(iqTenantId, transferId);
    if (!transfer) {
      return reply.status(404).send({ error: "NotFound" });
    }
    return reply.status(200).send({
      transferId: transfer.transferId,
      state: transfer.state,
      consentId: transfer.consentId,
      bundle: hasTransferBundle(transfer.bundleJson) ? transfer.bundleJson : undefined,
      error: transfer.error,
      ...(isM3MockGateway()
        ? {
            hiuPublicKeyB64: transfer.hiuPublicKeyB64,
            hiuNonceB64: transfer.hiuNonceB64,
          }
        : {}),
    });
  },
  );

  app.get(
    "/m3/hiu/attachment/:sessionId/:bundleId/:num",
    { config: { authMode: "protected" as const }, schema: { params: m3AttachmentParamsSchema } },
    async (req, reply) => {
      const iqTenantId = req.tenantId?.trim() ?? "";
      if (!iqTenantId) {
        return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
      }
      const { sessionId, bundleId, num: numStr } = req.params as {
        sessionId: string;
        bundleId: string;
        num: string;
      };
      const num = Number(numStr);
      const result = await getM3Attachment(
        { iqTenantId, sessionId, bundleId, num },
        getAbdmDeps(req),
      );
      if (!result) {
        return reply.status(404).send({ error: "NotFound" });
      }
      return reply.status(200).send({ data: result });
    },
  );
}
