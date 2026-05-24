import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { requestLoggingPlugin } from "./request-logging.js";

type CapturedLog = {
  line: string;
};

const apps: Array<ReturnType<typeof Fastify>> = [];

function createCaptureLogger() {
  const logs: CapturedLog[] = [];
  return {
    logs,
    logLine(line: string) {
      logs.push({ line });
    },
  };
}

afterEach(async () => {
  await Promise.all(
    apps.map(async (app) => {
      try {
        await app.close();
      } catch {
        // Best-effort close keeps test isolation simple.
      }
    }),
  );
  apps.length = 0;
});

describe("requestLoggingPlugin", () => {
  it("logs request and response with redacted headers", async () => {
    const capture = createCaptureLogger();
    const app = Fastify();
    apps.push(app);

    await app.register(requestLoggingPlugin, {
      logLine: capture.logLine,
      logRequestBody: true,
      maxBodyBytes: 256,
    });
    app.post("/echo", async (request) => ({ received: request.body }));

    const response = await app.inject({
      method: "POST",
      url: "/echo",
      headers: {
        authorization: "Bearer super-secret-token",
        "x-request-id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      },
      payload: { name: "x", value: 1 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d482");
    expect(capture.logs).toHaveLength(2);

    const incoming = capture.logs[0];
    const outgoing = capture.logs[1];

    expect(incoming?.line).toContain(
      "INFO [f47ac10b-58cc-4372-a567-0e02b2c3d482] app.requests: --> POST /echo",
    );
    expect(incoming?.line).toContain('"authorization":"[REDACTED]"');
    expect(incoming?.line).toContain('"name"');
    expect(outgoing?.line).toContain(
      "INFO [f47ac10b-58cc-4372-a567-0e02b2c3d482] app.requests: <-- 200 POST /echo",
    );
    expect(outgoing?.line).toContain("body=(empty)");
  });

  it("suppresses successful response bodies and logs error response bodies", async () => {
    const capture = createCaptureLogger();
    const app = Fastify();
    apps.push(app);

    await app.register(requestLoggingPlugin, {
      logLine: capture.logLine,
      maxBodyBytes: 256,
    });
    app.get("/ok", async () => ({ ok: true }));
    app.get("/bad-request", async (_request, reply) =>
      reply.code(400).send({ error: "bad input" }),
    );

    const okResponse = await app.inject({ method: "GET", url: "/ok" });
    expect(okResponse.statusCode).toBe(200);
    expect(capture.logs[1]?.line).toContain("body=(empty)");

    const errorResponse = await app.inject({ method: "GET", url: "/bad-request" });
    expect(errorResponse.statusCode).toBe(400);
    expect(capture.logs[3]?.line).toContain("bad input");
  });

  it("skips configured path prefixes", async () => {
    const capture = createCaptureLogger();
    const app = Fastify();
    apps.push(app);

    await app.register(requestLoggingPlugin, {
      logLine: capture.logLine,
      skipPathPrefixes: ["/skipme"],
    });
    app.get("/skipme", async () => ({ ok: true }));
    app.get("/visible", async () => ({ ok: true }));

    await app.inject({ method: "GET", url: "/skipme" });
    await app.inject({ method: "GET", url: "/visible" });

    expect(capture.logs).toHaveLength(2);
    expect(capture.logs[0]?.line).toContain("--> GET /visible");
    expect(capture.logs[1]?.line).toContain("<-- 200 GET /visible");
  });
});
