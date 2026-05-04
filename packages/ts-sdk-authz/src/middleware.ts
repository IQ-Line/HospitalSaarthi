import type { FastifyReply, FastifyRequest } from "fastify";
import type { PepMiddlewareOptions } from "./types.js";

export function createPepMiddleware(options: PepMiddlewareOptions) {
  const { resource, action, getResourceId, getResourceAttr } = options;

  return async function pepPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const resourceId = getResourceId
      ? getResourceId(request)
      : (request.params as Record<string, string>)["id"] ?? "unknown";

    const resourceAttr = getResourceAttr?.(request);

    const result = await request.checkResource(
      resource,
      resourceId,
      action,
      resourceAttr,
    );

    if (!result.isAllowed(action)) {
      reply.code(403).send({ error: "Forbidden" });
    }
  };
}
