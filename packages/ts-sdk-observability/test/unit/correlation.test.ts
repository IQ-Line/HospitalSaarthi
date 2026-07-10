import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CORRELATION_HEADER, correlationIdPlugin } from "../../src/index.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  return app;
}

describe("correlationIdPlugin", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();
    await app.register(correlationIdPlugin);
    app.get("/echo", async (request) => ({ correlationId: request.correlationId }));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("generates a uuid when no inbound header is present and echoes it", async () => {
    const res = await app.inject({ method: "GET", url: "/echo" });
    const id = res.json().correlationId as string;
    expect(id).toMatch(UUID_RE);
    expect(res.headers[CORRELATION_HEADER]).toBe(id);
  });

  it("preserves a valid inbound x-correlation-id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/echo",
      headers: { [CORRELATION_HEADER]: "trace-abc-123" },
    });
    expect(res.json().correlationId).toBe("trace-abc-123");
    expect(res.headers[CORRELATION_HEADER]).toBe("trace-abc-123");
  });

  it("falls back to x-request-id when x-correlation-id is absent", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/echo",
      headers: { "x-request-id": "req-999" },
    });
    expect(res.json().correlationId).toBe("req-999");
  });

  it("prefers x-correlation-id over x-request-id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/echo",
      headers: { [CORRELATION_HEADER]: "corr-1", "x-request-id": "req-2" },
    });
    expect(res.json().correlationId).toBe("corr-1");
  });

  it("rejects a garbage inbound id and generates a fresh uuid", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/echo",
      headers: { [CORRELATION_HEADER]: "bad id with spaces" },
    });
    expect(res.json().correlationId).toMatch(UUID_RE);
  });

  it("rejects an over-long inbound id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/echo",
      headers: { [CORRELATION_HEADER]: "a".repeat(200) },
    });
    expect(res.json().correlationId).toMatch(UUID_RE);
  });

  it("binds the id to the request child logger", async () => {
    // A minimal pino-shaped logger whose child() accumulates bindings, so we can
    // assert the plugin actually pushed correlationId onto request.log.
    type FakeLogger = {
      _bindings: Record<string, unknown>;
      level: string;
      info: () => void;
      warn: () => void;
      error: () => void;
      fatal: () => void;
      trace: () => void;
      debug: () => void;
      silent: () => void;
      child: (b: Record<string, unknown>) => FakeLogger;
    };
    const makeLogger = (bindings: Record<string, unknown>): FakeLogger => {
      const noop = (): void => undefined;
      const self: FakeLogger = {
        _bindings: bindings,
        level: "info",
        info: noop,
        warn: noop,
        error: noop,
        fatal: noop,
        trace: noop,
        debug: noop,
        silent: noop,
        child: (b) => makeLogger({ ...bindings, ...b }),
      };
      return self;
    };

    const custom = Fastify({ loggerInstance: makeLogger({}) as unknown as FastifyBaseLogger });
    await custom.register(correlationIdPlugin);
    let boundBindings: Record<string, unknown> = {};
    custom.get("/x", async (request) => {
      boundBindings = (request.log as unknown as FakeLogger)._bindings;
      return { ok: true };
    });
    await custom.ready();
    await custom.inject({
      method: "GET",
      url: "/x",
      headers: { [CORRELATION_HEADER]: "log-bound-1" },
    });
    expect(boundBindings.correlationId).toBe("log-bound-1");
    await custom.close();
  });
});
