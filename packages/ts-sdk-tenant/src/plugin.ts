import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { tenantStorage } from "./context.js";

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
  }
}

function tenantPluginImpl(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  app.decorateRequest("tenantId", "");

  // enterWith() transitions the current async context into the store,
  // so all downstream hooks and the route handler inherit it automatically.
  app.addHook("onRequest", async (request, reply) => {
    const user = (request as unknown as Record<string, unknown>).user as
      | Record<string, unknown>
      | undefined;

    const tenantId = (user?.iq_tenant_id as string) ?? undefined;

    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Missing iq_tenant_id in JWT claims",
      });
    }

    request.tenantId = tenantId;
    tenantStorage.enterWith({ tenantId });
  });

  done();
}

export const tenantPlugin = fp(tenantPluginImpl, {
  name: "@hims/ts-sdk-tenant",
  fastify: ">=5.0.0",
});
