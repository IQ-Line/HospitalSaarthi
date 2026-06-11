import type { DbInstance } from "@hims/ts-sdk-db";
import { createBedRepo } from "./data-access/bed.repo.js";
import { createEpisodeRepo } from "./data-access/episode.repo.js";
import type { BedRepo, EpisodeRepo } from "./ports.js";

export type IpdRepos = {
  episodeRepo: EpisodeRepo;
  bedRepo: BedRepo;
};

export function createIpdRepos(db: DbInstance | undefined, useMock: boolean): IpdRepos {
  return {
    episodeRepo: createEpisodeRepo(db, useMock),
    bedRepo: createBedRepo(db, useMock),
  };
}
