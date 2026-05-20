import type { FastifyInstance } from "fastify";
import type { AbdmAdapterDeps } from "../../ports.js";
import { hipInitiatedLinkStart } from "../../use-cases/m2/hip-initiated-link/start.js";
import { addContextsPublish } from "../../use-cases/m2/add-contexts/publish.js";
import { smsNotifyRequest } from "../../use-cases/m2/sms-notify/request.js";
import { LinkTokenNotAvailable } from "../../lib/link-token-cache.js";

export async function registerM2PlatformRoutes(
  app: FastifyInstance,
  deps: AbdmAdapterDeps,
): Promise<void> {
  app.post("/m2/hip/initiated-link/start", async (req, reply) => {
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
  });

  app.post("/m2/add-contexts/publish", async (req, reply) => {
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
  });

  app.post("/m2/sms/notify", async (req, reply) => {
    const iqTenantId = String(req.headers["x-tenant-id"] ?? "").trim();
    if (!iqTenantId) {
      return reply.status(400).send({ error: "BadRequest", message: "x-tenant-id required" });
    }
    const body = req.body as { phoneNo: string; hipName?: string };
    const result = await smsNotifyRequest({ iqTenantId, ...body }, deps);
    return reply.status(202).send(result);
  });
}
