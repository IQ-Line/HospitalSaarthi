import type { FastifyInstance } from "fastify";
import { getAbdmDeps } from "../../../../lib/get-abdm-deps.js";
import { AbdmGatewayError } from "../../lib/gateway-errors.js";
import { publicKeyFingerprint } from "../../lib/rsa-abdm-login-id.js";

/**
 * Ops / smoke routes — gateway session + ABHA public certificate reachability.
 * Does not persist `abdm_sessions` rows.
 */
export async function registerM0Routes(app: FastifyInstance): Promise<void> {
  app.get("/m0/gateway/session", async (req, reply) => {
    const deps = getAbdmDeps(req);
    try {
      const cert = await deps.gateway.getPublicCertificate();
      const diag = deps.gateway.getDiagnosticsSnapshot();
      return reply.send({
        ok: true,
        gateway: {
          tokenValidUntilApprox:
            diag.tokenValidUntilMs !== null
              ? new Date(diag.tokenValidUntilMs).toISOString()
              : null,
        },
        certificate: {
          encryptionAlgorithm: cert.encryptionAlgorithm,
          publicKeyFingerprint: publicKeyFingerprint(cert.publicKey),
          cacheValidUntilApprox:
            diag.certValidUntilMs !== null
              ? new Date(diag.certValidUntilMs).toISOString()
              : null,
        },
      });
    } catch (err) {
      if (err instanceof AbdmGatewayError) {
        return reply.status(502).send({
          ok: false,
          error: {
            message: err.message,
            statusCode: err.statusCode,
            code: err.abdmCode ?? null,
          },
        });
      }
      throw err;
    }
  });
}
