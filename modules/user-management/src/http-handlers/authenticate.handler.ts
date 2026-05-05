import type { FastifyInstance } from "fastify";
import type { SessionRepo } from "../ports.js";
import { authenticateLocal } from "../use-cases/authenticate-local.js";

interface LoginBody {
  username: string;
  password: string;
}

interface RefreshBody {
  refresh_token: string;
}

export function registerAuthenticateHandler(
  app: FastifyInstance,
  sessionRepo: SessionRepo,
): void {
  app.post<{ Body: LoginBody }>(
    "/auth/login",
    async (request, reply) => {
      const { username, password } = request.body;

      try {
        const result = await authenticateLocal(sessionRepo, {
          username,
          password,
          ip_address: request.ip,
          user_agent: request.headers["user-agent"],
        });

        return result;
      } catch {
        return reply.code(401).send({ error: "Invalid credentials" });
      }
    },
  );

  app.post<{ Body: RefreshBody }>(
    "/auth/refresh",
    async (request, reply) => {
      const { refresh_token } = request.body;

      // TODO: Delegate to better-auth session refresh
      // 1. Validate refresh_token via sessionRepo.findByToken()
      // 2. Check session expiry
      // 3. Issue new access token
      // 4. Optionally rotate refresh token

      const session = await sessionRepo.findByToken(refresh_token);

      if (!session || session.expires_at < new Date()) {
        return reply.code(401).send({ error: "Invalid or expired refresh token" });
      }

      return reply.code(501).send({ error: "Token refresh not yet implemented" });
    },
  );

  app.post(
    "/auth/logout",
    async (request, reply) => {
      // TODO: Extract session ID from JWT, invalidate via sessionRepo
      // For now, return 204 as a no-op placeholder

      return reply.code(204).send();
    },
  );
}
