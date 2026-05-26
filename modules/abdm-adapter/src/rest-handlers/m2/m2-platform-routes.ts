import type { FastifyInstance } from "fastify";
import type { AbdmAdapterDeps } from "../../ports.js";
import { hipInitiatedLinkStart } from "../../use-cases/m2/hip-initiated-link/start.js";
import { addContextsPublish } from "../../use-cases/m2/add-contexts/publish.js";
import { smsNotifyRequest } from "../../use-cases/m2/sms-notify/request.js";
import { LinkTokenNotAvailable } from "../../lib/link-token-cache.js";
import { linkTokenAcquire } from "../../use-cases/m2/link-token/acquire.js";
import { getLinkTokenStatus } from "../../use-cases/m2/link-token/status.js";
import { getAbdmSession } from "../../use-cases/m2/sessions/get-session.js";
import {
  addContextsPublishBodySchema,
  hipInitiatedLinkStartBodySchema,
  linkTokenAcquireBodySchema,
  linkTokenStatusQuerySchema,
  m2SessionIdParamSchema,
  smsNotifyBodySchema,
} from "./m2-route-schemas.js";

export async function registerM2PlatformRoutes(
  app: FastifyInstance,
  deps: AbdmAdapterDeps,
): Promise<void> {
  app.post(
    "/m2/link-token/acquire",
    { schema: { body: linkTokenAcquireBodySchema } },
    async (req, reply) => {
    const iqTenantId = String(req.headers["x-tenant-id"] ?? "").trim();
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const body = req.body as {
      abhaAddress: string;
      abhaNumber?: string;
      demographics: {
        name: string;
        gender: "M" | "F" | "O" | "D";
        yearOfBirth: number;
      };
      timeoutMs?: number;
      wait?: boolean;
    };
    const result = await linkTokenAcquire({ iqTenantId, ...body }, deps);
    const status =
      result.state === "FAILED" ? 503 : result.state === "TOKEN_AVAILABLE" ? 200 : 202;
    return reply.status(status).send(result);
  },
  );

  app.get(
    "/m2/link-token/status",
    { schema: { querystring: linkTokenStatusQuerySchema } },
    async (req, reply) => {
    const iqTenantId = String(req.headers["x-tenant-id"] ?? "").trim();
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const q = req.query as { sessionId?: string; abhaAddress?: string };
    const result = await getLinkTokenStatus(
      {
        iqTenantId,
        sessionId: q.sessionId?.trim(),
        abhaAddress: q.abhaAddress?.trim(),
      },
      deps,
    );
    if (result.state === "NOT_FOUND" && !result.tokenReady) {
      return reply.status(404).send(result);
    }
    return reply.status(200).send(result);
  },
  );

  app.get(
    "/m2/sessions/:sessionId",
    { schema: { params: m2SessionIdParamSchema } },
    async (req, reply) => {
    const iqTenantId = String(req.headers["x-tenant-id"] ?? "").trim();
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const sessionId = String((req.params as { sessionId: string }).sessionId ?? "").trim();
    const session = await getAbdmSession({ iqTenantId, sessionId }, deps);
    if (!session) {
      return reply.status(404).send({ error: "NotFound", message: "session not found" });
    }
    return reply.status(200).send(session);
  },
  );

  app.post(
    "/m2/hip/initiated-link/start",
    { schema: { body: hipInitiatedLinkStartBodySchema } },
    async (req, reply) => {
    const iqTenantId = String(req.headers["x-tenant-id"] ?? "").trim();
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const body = req.body as {
      abhaAddress: string;
      abhaNumber?: string;
      patientName: string;
      gender: "M" | "F" | "O" | "D";
      yearOfBirth: number;
      phoneNo?: string;
      careContexts: Array<{
        referenceNumber: string;
        display: string;
        hiType: string;
      }>;
    };
    try {
      const result = await hipInitiatedLinkStart(
        { iqTenantId, ...body },
        deps,
      );
      return reply.status(202).send(result);
    } catch (e) {
      if (e instanceof LinkTokenNotAvailable) {
        return reply.status(503).send({
          error: "Upstream",
          message: e.message,
        });
      }
      throw e;
    }
  },
  );

  app.post(
    "/m2/add-contexts/publish",
    { schema: { body: addContextsPublishBodySchema } },
    async (req, reply) => {
    const iqTenantId = String(req.headers["x-tenant-id"] ?? "").trim();
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const body = req.body as {
      abhaAddress: string;
      patientReference: string;
      careContextReference: string;
      hiType: string;
      eventDate?: string;
    };
    const result = await addContextsPublish({ iqTenantId, ...body }, deps);
    return reply.status(202).send(result);
  },
  );

  app.post(
    "/m2/sms/notify",
    { schema: { body: smsNotifyBodySchema } },
    async (req, reply) => {
    const iqTenantId = String(req.headers["x-tenant-id"] ?? "").trim();
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const body = req.body as { phoneNo: string; hipName?: string };
    const result = await smsNotifyRequest({ iqTenantId, ...body }, deps);
    return reply.status(202).send(result);
  },
  );
}
