import type { FastifyInstance } from "fastify";

/** Treat `Content-Type: application/json` with an empty body as `{}`. */
export function registerEmptyJsonBodyParser(fastify: FastifyInstance): void {
  fastify.removeContentTypeParser("application/json");
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (request, body, done) => {
      const text = typeof body === "string" ? body : body.toString();
      if (text.trim() === "") {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(text) as unknown);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        (err as Error & { statusCode?: number }).statusCode = 400;
        done(err, undefined);
      }
    },
  );
}
