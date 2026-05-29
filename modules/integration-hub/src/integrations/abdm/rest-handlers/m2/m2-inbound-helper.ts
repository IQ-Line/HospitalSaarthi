import type { FastifyReply, FastifyRequest } from "fastify";
import type { AbdmAdapterDeps } from "../../ports.js";
import { buildAbdmDepsForTenant, type IntegrationHubSharedInfra } from "../../../../lib/build-abdm-deps.js";
import { IntegrationProfileNotFoundError } from "../../../../lib/integration-hub-errors.js";
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
  sharedInfra: IntegrationHubSharedInfra;
  handler: (ctx: {
    iqTenantId: string;
    requestId: string;
    body: unknown;
    headers: Record<string, unknown>;
    deps: AbdmAdapterDeps;
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
            ? "Unexpected in NODE_ENV=development (JWS should be skipped). Restart integration-hub-svc after .env changes."
            : "Set ABDM_ALLOW_INSECURE_CALLBACKS=true for sandbox only, or configure ABDM_GATEWAY_JWKS_URL + JWT issuer/audience.",
      },
    });
  }

  let iqTenantId: string;
  try {
    iqTenantId = await resolveCallbackTenantId(headers, input.sharedInfra.profiles);
  } catch (e) {
    return input.reply.code(400).send({
      error: "BadRequest",
      message: e instanceof Error ? e.message : "tenant resolution failed",
    });
  }

  let integrationCtx;
  try {
    integrationCtx = await buildAbdmDepsForTenant(iqTenantId, input.sharedInfra);
  } catch (e) {
    if (e instanceof IntegrationProfileNotFoundError) {
      return input.reply.code(404).send({
        error: "NotFound",
        message: e.message,
        code: e.code,
      });
    }
    throw e;
  }

  const deps = integrationCtx.deps;

  let requestId: string;
  try {
    requestId = resolveInboundRequestId(headers, body);
  } catch (e) {
    return input.reply.code(400).send({
      error: "BadRequest",
      message: e instanceof Error ? e.message : "request id resolution failed",
    });
  }

  const isNew = await deps.inboundMessages.insertIfNew({
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
      deps,
    });
  } catch (e) {
    await deps.inboundMessages.release({ iqTenantId, requestId });
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
