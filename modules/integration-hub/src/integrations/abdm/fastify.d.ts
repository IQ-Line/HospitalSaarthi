import "fastify";

/** Ensures `tenantId` is typed when @hims/ts-sdk-tenant augments the request (merged). */
declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
  }
}
