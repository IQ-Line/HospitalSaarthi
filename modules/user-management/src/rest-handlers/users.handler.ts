import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type { UserRepo } from "../ports.js";
import type { UserFilters } from "../domain/user.types.js";
import { listUsers } from "../use-cases/list-users.js";
import { createUser } from "../use-cases/create-user.js";
import { deactivateUser } from "../use-cases/deactivate-user.js";

interface UsersQuery {
  status?: string;
  role?: string;
  limit?: string;
  offset?: string;
}

interface UserParams {
  id: string;
}

interface CreateUserBody {
  username: string;
  full_name: string;
  password: string;
  email?: string | null;
  phone?: string | null;
  kind?: string;
  employee_id?: string | null;
  recovery_tier?: string;
}

interface UpdateUserBody {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  employee_id?: string | null;
  status?: string;
  recovery_tier?: string;
}

export function registerUsersHandler(
  app: FastifyInstance,
  userRepo: UserRepo,
  eventBus: EventBus,
): void {
  app.get<{ Querystring: UsersQuery }>(
    "/users",
    async (request) => {
      const { status, role, limit, offset } = request.query;
      const tenantId = request.tenantId;

      const filters: UserFilters = {};
      if (status) filters.status = status as UserFilters["status"];
      if (role) filters.role = role;
      if (limit) filters.limit = parseInt(limit, 10);
      if (offset) filters.offset = parseInt(offset, 10);

      return listUsers(userRepo, tenantId, filters);
    },
  );

  app.get<{ Params: UserParams }>(
    "/users/:id",
    async (request, reply) => {
      const user = await userRepo.findById(request.tenantId, request.params.id);

      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      return { data: user };
    },
  );

  app.post<{ Body: CreateUserBody }>(
    "/users",
    async (request, reply) => {
      const user = await createUser(userRepo, eventBus, {
        iq_tenant_id: request.tenantId,
        username: request.body.username,
        full_name: request.body.full_name,
        password: request.body.password,
        email: request.body.email,
        phone: request.body.phone,
        kind: request.body.kind as CreateUserBody["kind"],
        employee_id: request.body.employee_id,
        recovery_tier: request.body.recovery_tier as CreateUserBody["recovery_tier"],
        created_by: request.user.userId,
        correlation_id: randomUUID(),
      });

      return reply.code(201).send({ data: user });
    },
  );

  app.patch<{ Params: UserParams; Body: UpdateUserBody }>(
    "/users/:id",
    async (request, reply) => {
      const user = await userRepo.update(
        request.tenantId,
        request.params.id,
        {
          ...request.body,
          updated_by: request.user.userId,
        } as UpdateUserBody & { updated_by: string },
      );

      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      return { data: user };
    },
  );

  app.post<{ Params: UserParams }>(
    "/users/:id/deactivate",
    async (request, reply) => {
      const user = await deactivateUser(userRepo, eventBus, {
        iq_tenant_id: request.tenantId,
        user_id: request.params.id,
        deactivated_by: request.user.userId,
        correlation_id: randomUUID(),
      });

      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      return { data: user };
    },
  );
}
