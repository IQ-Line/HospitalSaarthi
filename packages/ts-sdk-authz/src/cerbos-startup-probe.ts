import { GRPC } from "@cerbos/grpc";

function isCerbosTransportFailure(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const code = (err as { code?: number }).code;
  if (code === 14 || code === 4) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|No connection established|UNAVAILABLE/i.test(msg);
}

/**
 * Verifies gRPC connectivity to Cerbos before accepting traffic.
 * Does not interpret policy — any successful RPC response means the PDP is reachable.
 */
export async function assertCerbosReachable(cerbosUrl: string): Promise<void> {
  const client = new GRPC(cerbosUrl, {
    tls: false,
  });
  try {
    await client.checkResource({
      principal: {
        id: "startup-probe",
        roles: [],
        attr: {
          iq_tenant_id: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
          org_id: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        },
      },
      resource: { kind: "system:startup_probe", id: "ping" },
      actions: ["view"],
    });
  } catch (err) {
    if (isCerbosTransportFailure(err)) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Cerbos PDP unreachable at ${cerbosUrl}: ${detail}`);
    }
  } finally {
    client.close();
  }
}
