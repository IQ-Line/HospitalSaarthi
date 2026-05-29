import type { FastifyInstance, FastifyReply } from "fastify";
import type { AbdmAdapterDeps } from "../../ports.js";
import {
  AbdmGatewayError,
  formatNhaUpstreamMessage,
  parseNhaErrorBody,
} from "../../lib/gateway-errors.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";
import { enrolAadhaarOtpRequest } from "../../use-cases/m1/enrol-aadhaar-otp-request.js";
import { enrolAadhaarOtpResendRequest } from "../../use-cases/m1/enrol-aadhaar-otp-resend-request.js";
import { enrolAadhaarVerifyRequest } from "../../use-cases/m1/enrol-aadhaar-verify-request.js";
import { enrolMobileVerifySendOtpRequest } from "../../use-cases/m1/enrol-mobile-verify-send-otp-request.js";
import { enrolMobileVerifyConfirmOtpRequest } from "../../use-cases/m1/enrol-mobile-verify-confirm-otp-request.js";
import { abhaAddressSuggestionsRequest } from "../../use-cases/m1/abha-address-suggestions-request.js";
import { abhaAddressCreateRequest } from "../../use-cases/m1/abha-address-create-request.js";
import { profileAccountGetRequest } from "../../use-cases/m1/profile-account-get-request.js";
import { profileAbhaCardGetRequest } from "../../use-cases/m1/profile-abha-card-get-request.js";
import { profilePhrCardGetRequest } from "../../use-cases/m1/profile-phr-card-get-request.js";
import { profileQrCodeGetRequest } from "../../use-cases/m1/profile-qr-code-get-request.js";
import { sessionGetRequest } from "../../use-cases/m1/session-get-request.js";
import { loginAbhaNumberOtpRequest } from "../../use-cases/m1/login-abha-number-otp-request.js";
import { loginAadhaarOtpRequest } from "../../use-cases/m1/login-aadhaar-otp-request.js";
import { loginMobileOtpRequest } from "../../use-cases/m1/login-mobile-otp-request.js";
import { loginVerifyOtpRequest } from "../../use-cases/m1/login-verify-otp-request.js";
import { loginVerifyUserRequest } from "../../use-cases/m1/login-verify-user-request.js";
import { profileMobileUpdateOtpRequest } from "../../use-cases/m1/profile-mobile-update-otp-request.js";
import { profileMobileUpdateVerifyRequest } from "../../use-cases/m1/profile-mobile-update-verify-request.js";
import { profileEmailUpdateOtpRequest } from "../../use-cases/m1/profile-email-update-otp-request.js";
import { profileEmailUpdateVerifyRequest } from "../../use-cases/m1/profile-email-update-verify-request.js";
import { verifyAbhaNumberOtpRequest } from "../../use-cases/m1/verify-abha-number-otp-request.js";
import { verifyAbhaNumberVerifyRequest } from "../../use-cases/m1/verify-abha-number-verify-request.js";
import { verifyAbhaAddressOtpRequest } from "../../use-cases/m1/verify-abha-address-otp-request.js";
import { verifyAbhaAddressVerifyRequest } from "../../use-cases/m1/verify-abha-address-verify-request.js";
import {
  abhaAddressBodySchema,
  abhaAddressCreateBodySchema,
  abhaNumberBodySchema,
  aadhaar12BodySchema,
  aadhaarOtpResendBodySchema,
  enrolAadhaarVerifyBodySchema,
  mobile10BodySchema,
  mobileVerifyOtpBodySchema,
  otp6SessionBodySchema,
  loginVerifyUserBodySchema,
  profileUpdateEmailOtpBodySchema,
  profileUpdateMobileOtpBodySchema,
  sessionIdParamSchema,
  sessionIdQuerySchema,
} from "./m1-route-schemas.js";

function sendUpstream(reply: FastifyReply, err: AbdmGatewayError): unknown {
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

function sendUseCase(reply: FastifyReply, err: AbdmUseCaseError): unknown {
  return reply.status(err.httpStatus).send({
    error: err.clientCode,
    message: err.message,
  });
}

function parseUuid(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
    ? s
    : null;
}

export async function registerM1Routes(
  app: FastifyInstance,
  deps: AbdmAdapterDeps,
): Promise<void> {
  app.get(
    "/m1/sessions/:sessionId",
    { schema: { params: sessionIdParamSchema } },
    async (req, reply) => {
    const sessionId = parseUuid((req.params as { sessionId?: unknown })?.sessionId);
    if (!sessionId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "sessionId must be a UUID",
      });
    }
    try {
      const out = await sessionGetRequest({ sessionId, iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  },
  );

  app.post("/m1/enrol/aadhaar/otp", { schema: { body: aadhaar12BodySchema } }, async (req, reply) => {
    const raw = req.body as { aadhaarNumber: string };
    try {
      const out = await enrolAadhaarOtpRequest({
        aadhaarNumber: raw.aadhaarNumber,
        iqTenantId: req.tenantId,
      }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      throw err;
    }
  });

  app.post(
    "/m1/enrol/aadhaar/otp/resend",
    { schema: { body: aadhaarOtpResendBodySchema } },
    async (req, reply) => {
    const raw = req.body as { sessionId: string; aadhaarNumber: string };
    try {
      const out = await enrolAadhaarOtpResendRequest({
        sessionId: raw.sessionId,
        aadhaarNumber: raw.aadhaarNumber,
        iqTenantId: req.tenantId,
      }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.post(
    "/m1/enrol/aadhaar/verify",
    { schema: { body: enrolAadhaarVerifyBodySchema } },
    async (req, reply) => {
    const raw = req.body as {
      sessionId: string;
      otp: string;
      mobile: string;
      useAadhaarLinkedMobile?: boolean;
    };
    try {
      const out = await enrolAadhaarVerifyRequest({
        sessionId: raw.sessionId,
        otp: raw.otp,
        mobile: raw.mobile,
        useAadhaarLinkedMobile: raw.useAadhaarLinkedMobile,
        iqTenantId: req.tenantId,
      }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.post(
    "/m1/enrol/mobile-verify/otp",
    { schema: { body: mobileVerifyOtpBodySchema } },
    async (req, reply) => {
    const raw = req.body as { sessionId: string; mobile: string };
    try {
      const out = await enrolMobileVerifySendOtpRequest({
        sessionId: raw.sessionId,
        mobile: raw.mobile,
        iqTenantId: req.tenantId,
      }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.post(
    "/m1/enrol/mobile-verify/verify",
    { schema: { body: otp6SessionBodySchema } },
    async (req, reply) => {
    const raw = req.body as { sessionId: string; otp: string };
    try {
      const out = await enrolMobileVerifyConfirmOtpRequest({
        sessionId: raw.sessionId,
        otp: raw.otp,
        iqTenantId: req.tenantId,
      }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.get(
    "/m1/abha-address/suggestions",
    { schema: { querystring: sessionIdQuerySchema } },
    async (req, reply) => {
    const { sessionId } = req.query as { sessionId: string };
    try {
      const out = await abhaAddressSuggestionsRequest({ sessionId, iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.post(
    "/m1/abha-address",
    { schema: { body: abhaAddressCreateBodySchema } },
    async (req, reply) => {
    const raw = req.body as {
      sessionId: string;
      abhaAddress: string;
      preferred?: number | string;
    };
    const preferredRaw = raw.preferred;
    const preferred =
      typeof preferredRaw === "number" && Number.isFinite(preferredRaw)
        ? preferredRaw
        : typeof preferredRaw === "string" && preferredRaw.trim() !== ""
          ? Number(preferredRaw)
          : undefined;
    try {
      const out = await abhaAddressCreateRequest({
        sessionId: raw.sessionId,
        abhaAddress: raw.abhaAddress,
        ...(preferred !== undefined && !Number.isNaN(preferred) ? { preferred } : {}),
        iqTenantId: req.tenantId,
      }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.get(
    "/m1/profile",
    { schema: { querystring: sessionIdQuerySchema } },
    async (req, reply) => {
    const { sessionId } = req.query as { sessionId: string };
    try {
      const out = await profileAccountGetRequest({ sessionId, iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.post("/m1/login/otp", { schema: { body: abhaNumberBodySchema } }, async (req, reply) => {
    const raw = req.body as { abhaNumber?: unknown; channel?: unknown };
    try {
      const out = await loginAbhaNumberOtpRequest({
          abhaNumber: String(raw?.abhaNumber ?? ""),
          ...(raw?.channel === "aadhaar" || raw?.channel === "abha-otp"
            ? { channel: raw.channel }
            : {}), iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.post("/m1/login/aadhaar/otp", { schema: { body: aadhaar12BodySchema } }, async (req, reply) => {
    try {
      const out = await loginAadhaarOtpRequest({ aadhaarNumber: String((req.body as { aadhaarNumber?: unknown }).aadhaarNumber ?? ""), iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.post("/m1/login/mobile/otp", { schema: { body: mobile10BodySchema } }, async (req, reply) => {
    try {
      const out = await loginMobileOtpRequest({ mobile: String((req.body as { mobile?: unknown }).mobile ?? ""), iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.post("/m1/login/verify", { schema: { body: otp6SessionBodySchema } }, async (req, reply) => {
    const raw = req.body as { sessionId?: unknown; otp?: unknown };
    try {
      const out = await loginVerifyOtpRequest({ sessionId: String(raw.sessionId), otp: String(raw?.otp ?? ""), iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.post(
    "/m1/login/verify/user",
    { schema: { body: loginVerifyUserBodySchema } },
    async (req, reply) => {
      const raw = req.body as { sessionId?: unknown; abhaNumber?: unknown };
      try {
        const out = await loginVerifyUserRequest(
          {
            sessionId: String(raw.sessionId),
            abhaNumber: String(raw?.abhaNumber ?? ""),
            iqTenantId: req.tenantId,
          },
          deps,
          "abdm.m1.login.v1",
        );
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/verify/abha-number/otp",
    { schema: { body: abhaNumberBodySchema } },
    async (req, reply) => {
      const raw = req.body as { abhaNumber?: unknown; channel?: unknown };
      try {
        const out = await verifyAbhaNumberOtpRequest({
            abhaNumber: String(raw?.abhaNumber ?? ""),
            ...(raw?.channel === "aadhaar" || raw?.channel === "abha-otp"
              ? { channel: raw.channel }
              : {}), iqTenantId: req.tenantId }, deps);
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/verify/abha-number/verify",
    { schema: { body: otp6SessionBodySchema } },
    async (req, reply) => {
      const raw = req.body as { sessionId?: unknown; otp?: unknown };
      try {
        const out = await verifyAbhaNumberVerifyRequest({ sessionId: String(raw.sessionId), otp: String(raw?.otp ?? ""), iqTenantId: req.tenantId }, deps);
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/verify/abha-address/otp",
    { schema: { body: abhaAddressBodySchema } },
    async (req, reply) => {
      const raw = req.body as { abhaAddress?: unknown; channel?: unknown };
      try {
        const out = await verifyAbhaAddressOtpRequest({
            abhaAddress: String(raw?.abhaAddress ?? ""),
            ...(raw?.channel === "mobile" || raw?.channel === "aadhaar"
              ? { channel: raw.channel }
              : {}), iqTenantId: req.tenantId }, deps);
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/verify/abha-address/verify",
    { schema: { body: otp6SessionBodySchema } },
    async (req, reply) => {
      const raw = req.body as { sessionId?: unknown; otp?: unknown };
      try {
        const out = await verifyAbhaAddressVerifyRequest({ sessionId: String(raw.sessionId), otp: String(raw?.otp ?? ""), iqTenantId: req.tenantId }, deps);
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/verify/abha-address/verify/user",
    { schema: { body: loginVerifyUserBodySchema } },
    async (req, reply) => {
      const raw = req.body as { sessionId?: unknown; abhaNumber?: unknown };
      try {
        const out = await loginVerifyUserRequest(
          {
            sessionId: String(raw.sessionId),
            abhaNumber: String(raw?.abhaNumber ?? ""),
            iqTenantId: req.tenantId,
          },
          deps,
          "abdm.m1.verify-existing.v1",
        );
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/verify/abha-number/verify/user",
    { schema: { body: loginVerifyUserBodySchema } },
    async (req, reply) => {
      const raw = req.body as { sessionId?: unknown; abhaNumber?: unknown };
      try {
        const out = await loginVerifyUserRequest(
          {
            sessionId: String(raw.sessionId),
            abhaNumber: String(raw?.abhaNumber ?? ""),
            iqTenantId: req.tenantId,
          },
          deps,
          "abdm.m1.verify-existing.v1",
        );
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/profile/mobile/update/otp",
    { schema: { body: profileUpdateMobileOtpBodySchema } },
    async (req, reply) => {
      const raw = req.body as { sessionId?: unknown; mobile?: unknown };
      try {
        const out = await profileMobileUpdateOtpRequest({ sessionId: String(raw.sessionId), mobile: String(raw?.mobile ?? ""), iqTenantId: req.tenantId }, deps);
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/profile/mobile/update/verify",
    { schema: { body: otp6SessionBodySchema } },
    async (req, reply) => {
      const raw = req.body as { sessionId?: unknown; otp?: unknown };
      try {
        const out = await profileMobileUpdateVerifyRequest({ sessionId: String(raw.sessionId), otp: String(raw?.otp ?? ""), iqTenantId: req.tenantId }, deps);
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/profile/email/update/otp",
    { schema: { body: profileUpdateEmailOtpBodySchema } },
    async (req, reply) => {
      const raw = req.body as { sessionId?: unknown; email?: unknown };
      try {
        const out = await profileEmailUpdateOtpRequest({ sessionId: String(raw.sessionId), email: String(raw?.email ?? ""), iqTenantId: req.tenantId }, deps);
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.post(
    "/m1/profile/email/update/verify",
    { schema: { body: otp6SessionBodySchema } },
    async (req, reply) => {
      const raw = req.body as { sessionId?: unknown; otp?: unknown };
      try {
        const out = await profileEmailUpdateVerifyRequest({ sessionId: String(raw.sessionId), otp: String(raw?.otp ?? ""), iqTenantId: req.tenantId }, deps);
        return reply.status(200).send(out);
      } catch (err) {
        if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
        if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
        throw err;
      }
    },
  );

  app.get(
    "/m1/profile/abha-card",
    { schema: { querystring: sessionIdQuerySchema } },
    async (req, reply) => {
    const { sessionId } = req.query as { sessionId: string };
    try {
      const out = await profileAbhaCardGetRequest({ sessionId, iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.get(
    "/m1/profile/phr-card",
    { schema: { querystring: sessionIdQuerySchema } },
    async (req, reply) => {
    const { sessionId } = req.query as { sessionId: string };
    try {
      const out = await profilePhrCardGetRequest({ sessionId, iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });

  app.get(
    "/m1/profile/qr-code",
    { schema: { querystring: sessionIdQuerySchema } },
    async (req, reply) => {
    const { sessionId } = req.query as { sessionId: string };
    try {
      const out = await profileQrCodeGetRequest({ sessionId, iqTenantId: req.tenantId }, deps);
      return reply.status(200).send(out);
    } catch (err) {
      if (err instanceof AbdmGatewayError) return sendUpstream(reply, err);
      if (err instanceof AbdmUseCaseError) return sendUseCase(reply, err);
      throw err;
    }
  });
}
