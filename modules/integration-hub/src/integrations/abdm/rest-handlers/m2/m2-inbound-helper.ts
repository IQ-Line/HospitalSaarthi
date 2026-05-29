import type { FastifyReply, FastifyRequest } from "fastify";
import type { AbdmAdapterDeps } from "../../ports.js";
import { EmpiClientError } from "../../lib/empi-client-error.js";
import { verifyAbdmSignature } from "../../lib/abdm-signature-verifier.js";
import {
  allowInsecureAbdmCallbacks,
  nodeEnv,
} from "../../lib/abdm-runtime-env.js";
import { abdmWarn } from "../../lib/abdm-adapter-log.js";
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
    abdmWarn("abdm.callback.signature_rejected", {
      flowKind: input.flowKind,
      nodeEnv: nodeEnv(),
      allowInsecureCallbacks: allowInsecureAbdmCallbacks(),
      hasAuthorization: Boolean(
        headers.authorization ?? headers.Authorization,
      ),
    });
    return input.reply.code(401).send({
      error: {
        code: "ABDM-1411",
        message: "invalid-signature",
        hint:
          nodeEnv() === "development"
            ? "Unexpected in NODE_ENV=development (JWS should be skipped). Restart abdm-adapter-svc after .env changes."
            : "Set ABDM_ALLOW_INSECURE_CALLBACKS=true for sandbox only, or configure ABDM_GATEWAY_JWKS_URL + JWT issuer/audience.",
      },
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

  try {
    await input.handler({
      iqTenantId,
      requestId,
      body,
      headers,
    });
  } catch (e) {
    await input.deps.inboundMessages.release({ iqTenantId, requestId });
    if (e instanceof EmpiClientError) {
      return input.reply.code(502).send({
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: e.message,
        },
      });
    }
    throw e;
  }

  return input.reply.code(input.httpStatus).send();
}
