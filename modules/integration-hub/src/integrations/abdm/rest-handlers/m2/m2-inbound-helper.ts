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
  resolveCallbackTenant,
  resolveInboundRequestId,
} from "../../lib/resolve-callback-tenant.js";

type Resolved<T> = { ok: true; value: T } | { ok: false };

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

async function ensureSignatureValid(
  input: {
    req: FastifyRequest;
    reply: FastifyReply;
    flowKind: string;
  },
  headers: Record<string, unknown>,
  body: unknown,
): Promise<boolean> {
  if (await verifyAbdmSignature(headers, body)) {
    return true;
  }

  abdmWarn("abdm.callback.signature_rejected", {
    flowKind: input.flowKind,
    nodeEnv: nodeEnv(),
    allowInsecureCallbacks: allowInsecureAbdmCallbacks(),
    hasAuthorization: Boolean(headers.authorization ?? headers.Authorization),
  });
  await input.reply.code(401).send({
    error: {
      code: "ABDM-1411",
      message: "invalid-signature",
      hint:
        nodeEnv() === "development"
          ? "Unexpected in NODE_ENV=development (JWS should be skipped). Restart integration-hub-svc after .env changes."
          : "Set ABDM_ALLOW_INSECURE_CALLBACKS=true for sandbox only, or configure ABDM_GATEWAY_JWKS_URL + JWT issuer/audience.",
    },
  });
  return false;
}

async function resolveTenant(
  reply: FastifyReply,
  headers: Record<string, unknown>,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<Resolved<Awaited<ReturnType<typeof resolveCallbackTenant>>>> {
  try {
    return { ok: true, value: await resolveCallbackTenant(headers, sharedInfra.profiles) };
  } catch (e) {
    await reply.code(400).send({
      error: "BadRequest",
      message: errorMessage(e, "tenant resolution failed"),
    });
    return { ok: false };
  }
}

async function buildDeps(
  reply: FastifyReply,
  iqTenantId: string,
  sharedInfra: IntegrationHubSharedInfra,
  profile: Awaited<ReturnType<typeof resolveCallbackTenant>>["profile"],
): Promise<Resolved<AbdmAdapterDeps>> {
  try {
    const ctx = await buildAbdmDepsForTenant(iqTenantId, sharedInfra, { profile });
    return { ok: true, value: ctx.deps };
  } catch (e) {
    if (e instanceof IntegrationProfileNotFoundError) {
      await reply.code(404).send({
        error: "NotFound",
        message: e.message,
        code: e.code,
      });
      return { ok: false };
    }
    throw e;
  }
}

async function resolveRequestId(
  reply: FastifyReply,
  headers: Record<string, unknown>,
  body: unknown,
): Promise<Resolved<string>> {
  try {
    return { ok: true, value: resolveInboundRequestId(headers, body) };
  } catch (e) {
    await reply.code(400).send({
      error: "BadRequest",
      message: errorMessage(e, "request id resolution failed"),
    });
    return { ok: false };
  }
}

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

  if (!(await ensureSignatureValid(input, headers, body))) {
    return;
  }

  const resolved = await resolveTenant(input.reply, headers, input.sharedInfra);
  if (!resolved.ok) {
    return;
  }

  const iqTenantId = resolved.value.iqTenantId;

  const depsResult = await buildDeps(
    input.reply,
    iqTenantId,
    input.sharedInfra,
    resolved.value.profile,
  );
  if (!depsResult.ok) {
    return;
  }
  const deps = depsResult.value;

  const requestIdResult = await resolveRequestId(input.reply, headers, body);
  if (!requestIdResult.ok) {
    return;
  }
  const requestId = requestIdResult.value;

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
