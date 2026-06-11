import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DbInstance } from "@hims/ts-sdk-db";
import { createClinicalNoteRepo } from "./data-access/clinical-note.repo.js";
import { createEpisodeRepo } from "./data-access/episode.repo.js";
import { createInpatientOrderRepo } from "./data-access/inpatient-order.repo.js";
import { createVitalSignRepo } from "./data-access/vital-sign.repo.js";
import { registerAdmissionsHandler } from "./rest-handlers/admissions.handler.js";
import { registerClinicalNotesHandler } from "./rest-handlers/clinical-notes.handler.js";
import { registerInpatientOrdersHandler } from "./rest-handlers/inpatient-orders.handler.js";
import { registerVitalSignsHandler } from "./rest-handlers/vital-signs.handler.js";

export interface IpdRouterOptions {
  db?: DbInstance;
  useMock?: boolean;
}

export function createRouter(options: IpdRouterOptions) {
  return fp(
    async (app: FastifyInstance) => {
      const episodeRepo = createEpisodeRepo(options.db, options.useMock === true);
      const clinicalNoteRepo = createClinicalNoteRepo(options.db, options.useMock === true);
      const vitalSignRepo = createVitalSignRepo(options.db, options.useMock === true);
      const inpatientOrderRepo = createInpatientOrderRepo(options.db, options.useMock === true);
      registerAdmissionsHandler(app, episodeRepo);
      registerClinicalNotesHandler(app, { episodeRepo, clinicalNoteRepo });
      registerVitalSignsHandler(app, { episodeRepo, vitalSignRepo });
      registerInpatientOrdersHandler(app, { episodeRepo, inpatientOrderRepo });
    },
    { fastify: "5.x", name: "@hims/ipd" },
  );
}
