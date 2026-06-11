import type { FastifyReply } from "fastify";
import {
  DuplicateRoleCodeError,
  InvalidRoleSeedError,
  ModuleEntitlementLookupError,
  RoleInUseError,
  UnexpectedPersistenceError,
  UserManagementError,
} from "../domain/errors.js";

export type UserManagementErrorBody = {
  code: string;
  message: string;
  correlation_id: string;
  /** Present for `MODULE_ENTITLEMENT_LOOKUP_FAILED` — upstream that failed closed. */
  source?: "configurator" | "master_data";
  /** Enabled Configurator module ids with no Master Data catalog row. */
  unknown_module_ids?: string[];
};

export type ResolvedUserManagementHttpError = {
  status: number;
  body: UserManagementErrorBody;
};

/** Domain codes that map 1:1 to public HTTP status + body (message from error). */
const HTTP_STATUS_BY_DOMAIN_CODE: Readonly<Record<string, number>> = {
  INVALID_INPUT: 400,
  FULL_NAME_REQUIRED: 422,
  EMAIL_REQUIRED: 422,
  PASSWORD_REQUIRED: 422,
  PASSWORD_TOO_SHORT: 422,
  USER_NOT_FOUND: 404,
  ROLE_NOT_FOUND: 404,
  CAPABILITY_NOT_FOUND: 404,
  CAPABILITY_NOT_ENTITLED_FOR_TENANT: 400,
  INVALID_MODULE_SLUG: 400,
  INVALID_CAPABILITY_PROVENANCE: 500,
  ROLE_CODE_REQUIRED: 422,
  ROLE_DISPLAY_NAME_REQUIRED: 422,
  ROLE_CODE_DUPLICATE: 409,
  ROLE_IN_USE: 409,
  USER_ROLE_TEMPLATE_DUPLICATE: 409,
  USER_ROLE_TEMPLATE_NOT_FOUND: 404,
  AUTH_EMAIL_CONFLICT: 409,
  AUTH_ACCOUNT_PROVISIONING_FAILED: 500,
  AUTH_ACCOUNT_IDENTITY_MISMATCH: 500,
  USERNAME_CONFLICT: 409,
  API_KEY_INVALID: 401,
  TENANT_CONTEXT_MISMATCH: 403,
  RBAC_INTEGRITY_VIOLATION: 500,
  CERBOS_PRINCIPAL_UNAVAILABLE: 500,
  ENTITLEMENT_LOOKUP_FAILED: 503,
  MODULE_ENTITLEMENT_LOOKUP_FAILED: 503,
};

function internalMaskedResponse(correlationId: string): ResolvedUserManagementHttpError {
  return {
    status: 500,
    body: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      correlation_id: correlationId,
    },
  };
}

/**
 * Maps domain/application errors to HTTP. Unknown errors are treated as internal failures.
 */
export function resolveUserManagementHttpError(
  err: unknown,
  correlationId: string,
): ResolvedUserManagementHttpError {
  if (
    err instanceof UnexpectedPersistenceError ||
    err instanceof InvalidRoleSeedError ||
    err instanceof DuplicateRoleCodeError ||
    err instanceof RoleInUseError
  ) {
    if (err instanceof UserManagementError) {
      const status = HTTP_STATUS_BY_DOMAIN_CODE[err.code] ?? 500;
      return {
        status,
        body: {
          code: err.code,
          message: err.message,
          correlation_id: correlationId,
        },
      };
    }
    return internalMaskedResponse(correlationId);
  }

  if (err instanceof UserManagementError) {
    const status = HTTP_STATUS_BY_DOMAIN_CODE[err.code] ?? 500;
    const body: UserManagementErrorBody = {
      code: err.code,
      message: err.message,
      correlation_id: correlationId,
    };
    if (err instanceof ModuleEntitlementLookupError) {
      body.source = err.source;
      if (err.unknownModuleIds !== undefined && err.unknownModuleIds.length > 0) {
        body.unknown_module_ids = [...err.unknownModuleIds];
      }
    }
    return { status, body };
  }

  return internalMaskedResponse(correlationId);
}

/**
 * Logs server-side failures (HTTP >= 500) with the ORIGINAL error attached, so a
 * masked `INTERNAL_ERROR` response stays debuggable: the public body hides the
 * cause from the client, but this line preserves the real type/message/stack for
 * operators. Client errors (4xx) are expected outcomes and are intentionally not
 * logged here to avoid noise.
 */
function logUserManagementHttpError(
  reply: FastifyReply,
  err: unknown,
  resolved: ResolvedUserManagementHttpError,
  correlationId: string,
): void {
  if (resolved.status < 500) {
    return;
  }
  const logger = reply.log;
  if (logger === undefined || typeof logger.error !== "function") {
    return;
  }
  logger.error(
    {
      err,
      correlation_id: correlationId,
      status: resolved.status,
      code: resolved.body.code,
      // `INTERNAL_ERROR` means the original error was unmapped/unexpected and is
      // masked from the client — without this line its cause/stack is lost.
      masked: resolved.body.code === "INTERNAL_ERROR",
    },
    "user-management request failed",
  );
}

export function replyWithUserManagementError(
  reply: FastifyReply,
  err: unknown,
  correlationId: string,
): FastifyReply {
  const resolved = resolveUserManagementHttpError(err, correlationId);
  logUserManagementHttpError(reply, err, resolved, correlationId);
  return reply.status(resolved.status).send(resolved.body);
}
