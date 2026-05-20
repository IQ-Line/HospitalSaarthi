import type { FastifyReply, FastifyRequest } from "fastify";
import type { AbdmAdapterDeps } from "../../ports.js";
import { verifyAbdmSignature } from "../../lib/abdm-signature-verifier.js";
import {
  resolveCallbackTenantId,
  resolveInboundRequestId,
} from "../../lib/resolve-callback-tenant.js";

export async function runInboundCallback(input: {
  req: FastifyRequest;
  reply: FastifyReply;
  flowKind: string;
  httpStatus: 200 | 202;
  deps: AbdmAdapterDeps;
  handler: (ctx: {
    iqTenantId: string;
    requestId: string;
    body: unknown;
    headers: Record<string, unknown>;
  }) => Promise<void>;
}): Promise<void> {
  const headers = input.req.headers as Record<string, unknown>;
  const body = input.req.body;

  const signatureValid = await verifyAbdmSignature(headers, body);
  if (!signatureValid) {
    return input.reply.code(401).send({
      error: { code: "ABDM-1411", message: "invalid-signature" },
    });
  }

  let iqTenantId: string;
  try {
    iqTenantId = resolveCallbackTenantId(headers);
  } catch (e) {
    return input.reply.code(400).send({
      error: "BadRequest",
      message: e instanceof Error ? e.message : "tenant resolution failed",
    });
  }

  let requestId: string;
  try {
    requestId = resolveInboundRequestId(headers, body);
  } catch (e) {
    return input.reply.code(400).send({
      error: "BadRequest",
      message: e instanceof Error ? e.message : "request id resolution failed",
    });
  }

  const isNew = await input.deps.inboundMessages.insertIfNew({
    iqTenantId,
    requestId,
    flowKind: input.flowKind,
  });
  if (!isNew) {
    return input.reply.code(input.httpStatus).send();
  }

  await input.handler({
    iqTenantId,
    requestId,
    body,
    headers,
  });

  return input.reply.code(input.httpStatus).send();
}
