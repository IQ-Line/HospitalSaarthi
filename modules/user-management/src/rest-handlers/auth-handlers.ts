import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  AuthInvalidCredentialsError,
  CerbosPrincipalUnavailableError,
  UserNotFoundError,
} from "../domain/errors.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import type {
  AccessTokenIssuerPort,
  PrincipalService,
  UserRepository,
} from "../ports/index.js";
import { getUserById } from "../use-cases/get-user.js";
import type { GetUserDeps } from "../use-cases/get-user.js";
import {
  validateUserApiKey,
  type ValidateUserApiKeyDeps,
} from "../use-cases/validate-user-api-key.js";
import { clearMustChangePassword } from "../use-cases/clear-must-change-password.js";
import type { ClearMustChangePasswordDeps } from "../use-cases/clear-must-change-password.js";

type InteractiveSignInPort = {
  signIn(input: {
    identifier: string;
    password: string;
  }): Promise<{
    authUserId: string;
    sessionToken: string;
    setCookieHeaders?: readonly string[];
  }>;
};

export type BootstrapInteractiveLoginDeps = {
  interactiveSignIn: InteractiveSignInPort;
  userRepository: UserRepository;
  accessTokenIssuer: AccessTokenIssuerPort;
  principalService: PrincipalService;
};

async function bootstrapInteractiveLogin(
  deps: BootstrapInteractiveLoginDeps,
  input: { identifier: string; password: string },
) {
  const identifier = input.identifier.trim();
  const password = input.password;
  if (identifier === "" || password === "") {
    throw new AuthInvalidCredentialsError();
  }

  const signIn = await deps.interactiveSignIn.signIn({ identifier, password });
  const platformUser = await deps.userRepository.findUserByGlobalId(signIn.authUserId);
  if (platformUser === null) {
    throw new UserNotFoundError(signIn.authUserId);
  }

  const [tokens, principal, user] = await Promise.all([
    deps.accessTokenIssuer.issueForPlatformUser(platformUser.id),
    deps.principalService.getPrincipal({
      tenantId: platformUser.iq_tenant_id,
      userId: platformUser.id,
    }),
    getUserById({ userRepository: deps.userRepository }, platformUser.iq_tenant_id, platformUser.id),
  ]);

  if (user === null) {
    throw new UserNotFoundError(platformUser.id);
  }

  return {
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    expires_in: tokens.expires_in,
    refresh_token: tokens.refresh_token,
    refresh_expires_in: tokens.refresh_expires_in,
    session_token: signIn.sessionToken,
    tenant_id: platformUser.iq_tenant_id,
    user,
    principal,
    setCookieHeaders: signIn.setCookieHeaders,
  };
}

function readApiKeyHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim();
  return typeof value === "string" ? value.trim() : undefined;
}

function resolveApiKeyFromRequest(request: FastifyRequest): string | undefined {
  return (
    readApiKeyHeader(request.headers["x-api-key"]) ??
    (typeof request.body === "object" &&
    request.body !== null &&
    "api_key" in request.body &&
    typeof (request.body as { api_key?: unknown }).api_key === "string"
      ? (request.body as { api_key: string }).api_key.trim()
      : undefined)
  );
}

export type AuthHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getUserId: (request: FastifyRequest) => string;
  getUserDeps: GetUserDeps;
  validateUserApiKeyDeps: ValidateUserApiKeyDeps;
  clearMustChangePasswordDeps: ClearMustChangePasswordDeps;
  bootstrapInteractiveLoginDeps?: BootstrapInteractiveLoginDeps;
};

export function registerAuthHandlers(fastify: FastifyInstance, deps: AuthHandlersDeps): void {
  fastify.get(
    "/auth/me",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const userId = deps.getUserId(request);
      const cid = request.correlationId ?? request.id;
      const user = await getUserById(deps.getUserDeps, tenantId, userId);
      if (user === null) {
        return replyWithUserManagementError(reply, new UserNotFoundError(userId), cid);
      }
      return reply.send(user);
    },
  );

  fastify.post(
    "/auth/change-password-complete",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const userId = deps.getUserId(request);
      const cid = request.correlationId ?? request.id;
      try {
        const user = await clearMustChangePassword(
          deps.clearMustChangePasswordDeps,
          { tenantId, actorId: userId, correlationId: cid },
          userId,
        );
        return reply.send(user);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get(
    "/auth/principal",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      const snapshot = request.cerbosPrincipal;
      if (snapshot === undefined) {
        return replyWithUserManagementError(reply, new CerbosPrincipalUnavailableError(), cid);
      }
      return reply.send(snapshot);
    },
  );

  void fastify.register(async (scope) => {
    scope.removeContentTypeParser("application/json");
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (_request, body, done) => {
        const text = typeof body === "string" ? body : body.toString();
        if (text.trim() === "") {
          done(null, {});
          return;
        }
        try {
          done(null, JSON.parse(text) as unknown);
        } catch (error) {
          done(error as Error, undefined);
        }
      },
    );

    const routeConfig = { config: { authMode: "public" as const } };

    scope.post("/auth/login", routeConfig, async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      if (!deps.bootstrapInteractiveLoginDeps) {
        return reply.status(503).send({
          code: "AUTH_LOGIN_UNAVAILABLE",
          message: "Interactive login is not configured on this service instance.",
          correlation_id: cid,
        });
      }
      const body = request.body as { identifier?: unknown; password?: unknown };
      const identifier = typeof body.identifier === "string" ? body.identifier : "";
      const password = typeof body.password === "string" ? body.password : "";
      try {
        const result = await bootstrapInteractiveLogin(deps.bootstrapInteractiveLoginDeps, {
          identifier,
          password,
        });
        for (const cookie of result.setCookieHeaders ?? []) {
          reply.header("set-cookie", cookie);
        }
        const { setCookieHeaders: _cookies, ...payload } = result;
        return reply.send(payload);
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    });

    const handler = async (request: FastifyRequest, reply: { status: (n: number) => { send: (b: unknown) => unknown }; send: (b: unknown) => unknown }) => {
      const cid = request.correlationId ?? request.id;
      const apiKey = resolveApiKeyFromRequest(request);
      if (!apiKey) {
        return reply.status(400).send({
          code: "API_KEY_REQUIRED",
          message: "X-API-Key header or api_key body field is required",
          correlation_id: cid,
        });
      }
      try {
        return reply.send(await validateUserApiKey(deps.validateUserApiKeyDeps, apiKey));
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    };

    scope.post("/auth/api-key/validate", routeConfig, handler);
    scope.get("/auth/api-key/validate", routeConfig, handler);
  });
}
