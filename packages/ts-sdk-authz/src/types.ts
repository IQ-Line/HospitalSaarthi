import type { FastifyRequest } from "fastify";
import type {
  CheckResourcesResult,
  PlanResourcesResponse,
  Value,
} from "@cerbos/core";

export interface AuthzPluginOptions {
  cerbosUrl: string;
  playgroundInstance?: string;
  resolveTarget?: AuthzTargetResolver;
}

export interface AuthzTarget {
  kind: string;
  id: string;
  action: string;
  attr?: Record<string, Value>;
}

export interface ResourceCheck {
  kind: string;
  id: string;
  action: string;
  attr?: Record<string, Value>;
}

export type CheckResult = CheckResourcesResult;

export type PlanResult = PlanResourcesResponse;

export type AuthzTargetResolver = (
  request: FastifyRequest,
) => AuthzTarget | null | Promise<AuthzTarget | null>;

export interface PepMiddlewareOptions {
  resource: string;
  action: string;
  getResourceId?: (request: FastifyRequest) => string;
  getResourceAttr?: (request: FastifyRequest) => Record<string, Value>;
}

declare module "fastify" {
  interface FastifyRequest {
    checkResource: (
      kind: string,
      id: string,
      action: string,
      attr?: Record<string, Value>,
    ) => Promise<CheckResult>;
    planResources: (
      kind: string,
      action: string,
      attr?: Record<string, Value>,
    ) => Promise<PlanResult>;
  }
}
