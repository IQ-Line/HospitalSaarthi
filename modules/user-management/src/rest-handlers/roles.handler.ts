import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type { RoleRepo } from "../ports.js";
import { assignRole } from "../use-cases/assign-role.js";

interface CreateRoleBody {
  name: string;
  display_name: string;
  description?: string | null;
  scope_level?: string;
}

interface UserRoleParams {
  id: string;
}

interface AssignRoleBody {
  role_id: string;
  scope_type?: string;
  scope_id?: string;
}

export function registerRolesHandler(
  app: FastifyInstance,
  roleRepo: RoleRepo,
  eventBus: EventBus,
): void {
  app.get(
    "/roles",
    async (request) => {
      const roles = await roleRepo.findAll(request.tenantId);
      return { data: roles };
    },
  );

  app.post<{ Body: CreateRoleBody }>(
    "/roles",
    async (request, reply) => {
      const role = await roleRepo.create({
        iq_tenant_id: request.tenantId,
        name: request.body.name,
        display_name: request.body.display_name,
        description: request.body.description,
        scope_level: request.body.scope_level as CreateRoleBody["scope_level"],
        created_by: request.user.userId,
      });

      return reply.code(201).send({ data: role });
    },
  );

  app.post<{ Params: UserRoleParams; Body: AssignRoleBody }>(
    "/users/:id/roles",
    async (request, reply) => {
      const assignment = await assignRole(roleRepo, eventBus, {
        iq_tenant_id: request.tenantId,
        user_id: request.params.id,
        role_id: request.body.role_id,
        scope_type: request.body.scope_type,
        scope_id: request.body.scope_id,
        assigned_by: request.user.userId,
        correlation_id: randomUUID(),
      });

      return reply.code(201).send({ data: assignment });
    },
  );
}
