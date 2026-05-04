import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { IdentityPluginOptions, Principal } from "./types.js";
import { verifyToken } from "./verify.js";

const SKIP_PATHS = new Set(["/healthz", "/readyz", "/livez"]);

declare module "fastify" {
  interface FastifyRequest {
    user: Principal;
  }
}

async function identityPluginFn(
  fastify: FastifyInstance,
  options: IdentityPluginOptions,
): Promise<void> {
  fastify.decorateRequest("user", null);

  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (SKIP_PATHS.has(request.url)) return;

      const header = request.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        reply.code(401).send({ error: "Missing or malformed Authorization header" });
        return;
      }

      const token = header.slice(7);
      try {
        request.user = await verifyToken(token, options);
      } catch {
        reply.code(401).send({ error: "Invalid or expired token" });
      }
    },
  );
}

export const identityPlugin = fp(identityPluginFn, {
  fastify: "5.x",
  name: "@hims/ts-sdk-identity",
});
