/**
 * Cerbos PDP gRPC target for this process.
 * Set `CERBOS_URL` to override (see Phase 0 `.env.example`).
 * Default matches the loopback sidecar address from the Module Shape Template (HLD 03 §2).
 */
const DEFAULT_CERBOS_GRPC_TARGET = "127.0.0.1:3593";

export function resolveCerbosGrpcTarget(): string {
  const fromEnv = process.env.CERBOS_URL?.trim();
  return fromEnv !== undefined && fromEnv.length > 0 ? fromEnv : DEFAULT_CERBOS_GRPC_TARGET;
}
