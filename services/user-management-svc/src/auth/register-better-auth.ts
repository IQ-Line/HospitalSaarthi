import cors from "@fastify/cors";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import type { HimsBetterAuthInstance } from "./create-hims-better-auth.js";

export type RegisterBetterAuthOptions = {
  trustedOrigins: string[];
};

/**
 * Mounts better-auth on `/api/auth/*` (sessions, sign-in, JWT `/token`, JWKS `/.well-known/jwks.json` under basePath).
 */
export async function registerBetterAuth(
  app: FastifyInstance,
  auth: HimsBetterAuthInstance,
  options: RegisterBetterAuthOptions,
): Promise<void> {
  await app.register(cors, {
    origin: options.trustedOrigins.length > 0 ? options.trustedOrigins : true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "iq_tenant_id",
      "X-Requested-With",
      "X-Correlation-Id",
      "Cookie",
    ],
    credentials: true,
    maxAge: 86_400,
  });

  app.route({
    method: ["GET", "POST", "OPTIONS"],
    url: "/api/auth/*",
    config: { authMode: "public" as const },
    async handler(request, reply) {
      if (request.method === "OPTIONS") {
        return reply.status(204).send();
      }

      const host = request.headers.host ?? "localhost";
      const xfProto = request.headers["x-forwarded-proto"];
      const proto =
        typeof xfProto === "string" && xfProto.trim().length > 0 ? xfProto.trim() : "http";
      const url = new URL(request.url, `${proto}://${host}`);
      const headers = fromNodeHeaders(request.headers);

      let body: string | undefined;
      if (request.method !== "GET" && request.method !== "HEAD") {
        body =
          typeof request.body === "string"
            ? request.body
            : JSON.stringify(request.body ?? {});
      }

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body,
      });

      const res = await auth.handler(req);
      reply.status(res.status);
      const setCookies =
        typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
      res.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          return;
        }
        reply.header(key, value);
      });
      if (setCookies.length > 0) {
        reply.header("set-cookie", setCookies);
      }
      const text = await res.text();
      return reply.send(text.length > 0 ? text : null);
    },
  });
}
