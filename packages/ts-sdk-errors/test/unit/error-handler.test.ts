import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ForbiddenError,
  NotFoundError,
  PROBLEM_CONTENT_TYPE,
  registerProblemErrorHandler,
  ValidationError,
} from "../../src/index.js";

function buildApp(): FastifyInstance {
  // Silence logs but keep the logger present so the handler's `request.log.error` works.
  const app = Fastify({ logger: false });
  registerProblemErrorHandler(app);

  app.get("/not-found", async () => {
    throw new NotFoundError("patient 42 not found");
  });
  app.get("/forbidden", async () => {
    throw new ForbiddenError("blocked", { extensions: { requiredCapability: "patients:read" } });
  });
  app.get("/validation", async () => {
    throw new ValidationError("bad", { errors: [{ field: "name", message: "required" }] });
  });
  app.get("/boom", async () => {
    throw new Error("secret internal detail: connection string leaked");
  });
  app.post(
    "/schema",
    {
      schema: {
        body: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string" } },
        },
      },
    },
    async () => ({ ok: true }),
  );
  return app;
}

describe("registerProblemErrorHandler", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("maps an AppError to its problem with problem+json content-type", async () => {
    const res = await app.inject({ method: "GET", url: "/not-found" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain(PROBLEM_CONTENT_TYPE);
    const body = res.json();
    expect(body.type).toBe("urn:hims:error:not_found");
    expect(body.title).toBe("Resource Not Found");
    expect(body.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.detail).toBe("patient 42 not found");
    expect(body.instance).toBe("/not-found");
    // correlationId falls back to Fastify request.id when no plugin set one.
    expect(typeof body.correlationId).toBe("string");
    expect(body.correlationId.length).toBeGreaterThan(0);
  });

  it("carries extension members through", async () => {
    const res = await app.inject({ method: "GET", url: "/forbidden" });
    expect(res.statusCode).toBe(403);
    expect(res.json().requiredCapability).toBe("patients:read");
  });

  it("maps a thrown ValidationError with structured errors", async () => {
    const res = await app.inject({ method: "GET", url: "/validation" });
    expect(res.statusCode).toBe(400);
    expect(res.json().errors).toEqual([{ field: "name", message: "required" }]);
  });

  it("maps Fastify/AJV schema validation to a 400 problem with field errors", async () => {
    const res = await app.inject({ method: "POST", url: "/schema", payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain(PROBLEM_CONTENT_TYPE);
    const body = res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.status).toBe(400);
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors[0].field).toBe("name");
  });

  it("maps an unknown Route (404) to a passthrough problem, not a 500", async () => {
    const res = await app.inject({ method: "GET", url: "/does-not-exist" });
    expect(res.statusCode).toBe(404);
    expect(res.json().status).toBe(404);
  });

  it("never leaks internals for unknown errors — opaque 500", async () => {
    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(500);
    expect(res.headers["content-type"]).toContain(PROBLEM_CONTENT_TYPE);
    const body = res.json();
    expect(body.status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.detail).toBe("An unexpected error occurred.");
    // The real message must NOT appear anywhere in the response.
    expect(JSON.stringify(body)).not.toContain("secret internal detail");
  });

  it("honors a custom correlation id extractor", async () => {
    const custom = Fastify({ logger: false });
    registerProblemErrorHandler(custom, { getCorrelationId: () => "corr-abc-123" });
    custom.get("/x", async () => {
      throw new NotFoundError("nope");
    });
    await custom.ready();
    const res = await custom.inject({ method: "GET", url: "/x" });
    expect(res.json().correlationId).toBe("corr-abc-123");
    await custom.close();
  });
});
