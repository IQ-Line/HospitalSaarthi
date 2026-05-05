import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { EventBus } from "@hims/ts-sdk-events";
import type { UserRepo, RoleRepo, SessionRepo } from "./ports.js";
import { registerAuthenticateHandler } from "./http-handlers/authenticate.handler.js";
import { registerUsersHandler } from "./rest-handlers/users.handler.js";
import { registerRolesHandler } from "./rest-handlers/roles.handler.js";

export interface UserManagementRouterOptions {
  userRepo: UserRepo;
  roleRepo: RoleRepo;
  sessionRepo: SessionRepo;
  eventBus: EventBus;
}

async function userManagementRouter(
  app: FastifyInstance,
  options: UserManagementRouterOptions,
): Promise<void> {
  registerAuthenticateHandler(app, options.sessionRepo);
  registerUsersHandler(app, options.userRepo, options.eventBus);
  registerRolesHandler(app, options.roleRepo, options.eventBus);
}

export function createRouter(options: UserManagementRouterOptions) {
  return fp(
    async (app: FastifyInstance) => userManagementRouter(app, options),
    { fastify: "5.x", name: "@hims/user-management" },
  );
}
