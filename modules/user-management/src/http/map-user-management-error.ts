import type { FastifyReply } from "fastify";
import {
  DuplicateRoleCodeError,
  InvalidRoleSeedError,
  RoleInUseError,
  UnexpectedPersistenceError,
  UserManagementError,
} from "../domain/errors.js";

export type UserManagementErrorBody = {
  code: string;
  message: string;
  correlation_id: string;
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
  ROLE_CODE_REQUIRED: 422,
  ROLE_DISPLAY_NAME_REQUIRED: 422,
  ROLE_CODE_DUPLICATE: 409,
  ROLE_IN_USE: 409,
  ROLE_ASSIGNMENT_DUPLICATE: 409,
  ROLE_ASSIGNMENT_NOT_FOUND: 404,
  USER_ROLE_TEMPLATE_DUPLICATE: 409,
  USER_ROLE_TEMPLATE_NOT_FOUND: 404,
  AUTH_EMAIL_CONFLICT: 409,
  AUTH_ACCOUNT_PROVISIONING_FAILED: 500,
  AUTH_ACCOUNT_IDENTITY_MISMATCH: 500,
  USERNAME_CONFLICT: 409,
  TENANT_CONTEXT_MISMATCH: 400,
  RBAC_INTEGRITY_VIOLATION: 500,
  CERBOS_PRINCIPAL_UNAVAILABLE: 500,
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

export function replyWithUserManagementError(
  reply: FastifyReply,
  err: unknown,
  correlationId: string,
): FastifyReply {
  const { status, body } = resolveUserManagementHttpError(err, correlationId);
  return reply.status(status).send(body);
}
