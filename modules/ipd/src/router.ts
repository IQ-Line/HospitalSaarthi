import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DbInstance } from "@hims/ts-sdk-db";
import { createEpisodeRepo } from "./data-access/episode.repo.js";
import { registerAdmissionsHandler } from "./rest-handlers/admissions.handler.js";

export interface IpdRouterOptions {
  db?: DbInstance;
  useMock?: boolean;
}

export function createRouter(options: IpdRouterOptions) {
  return fp(
    async (app: FastifyInstance) => {
      const repo = createEpisodeRepo(options.db, options.useMock === true);
      registerAdmissionsHandler(app, repo);
    },
    { fastify: "5.x", name: "@hims/ipd" },
  );
}
