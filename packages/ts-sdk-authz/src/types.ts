import type { FastifyRequest } from "fastify";
import type {
  CheckResourcesResult,
  PlanResourcesResponse,
  Value,
} from "@cerbos/core";

export interface AuthzPluginOptions {
  cerbosUrl: string;
  playgroundInstance?: string;
}

export interface ResourceCheck {
  kind: string;
  id: string;
  action: string;
  attr?: Record<string, Value>;
}

export type CheckResult = CheckResourcesResult;

export type PlanResult = PlanResourcesResponse;

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
