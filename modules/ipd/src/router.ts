import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { EventBus } from "@hims/ts-sdk-events";
import type { DbInstance } from "@hims/ts-sdk-db";
import { createIpdRepos } from "./create-repos.js";
import { registerAdmissionsHandler } from "./rest-handlers/admissions.handler.js";

export interface IpdRouterOptions {
  db?: DbInstance;
  useMock?: boolean;
  eventBus: EventBus;
}

export function createRouter(options: IpdRouterOptions) {
  return fp(
    async (app: FastifyInstance) => {
      const repos = createIpdRepos(options.db, options.useMock === true);
      registerAdmissionsHandler(app, repos, options.eventBus);
    },
    { fastify: "5.x", name: "@hims/ipd" },
  );
}
