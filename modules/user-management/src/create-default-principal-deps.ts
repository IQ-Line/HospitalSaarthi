import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzlePrincipalAuthorizationRepository } from "./data-access/principal-authorization-repository.js";
import { DrizzlePrincipalRoleProjectionRepository } from "./data-access/drizzle-principal-role-projection-repository.js";
import { DrizzleUserRepository } from "./data-access/user-repository.js";
import { createDefaultPrincipalService } from "./services/default-principal-service.js";
import type { PrincipalService } from "./ports/index.js";

export interface PrincipalDeps {
  userRepository: DrizzleUserRepository;
  principalRoleProjectionRepository: DrizzlePrincipalRoleProjectionRepository;
  principalAuthorizationRepository: DrizzlePrincipalAuthorizationRepository;
  principalService: PrincipalService;
}

export function createDefaultPrincipalDeps(db: DbInstance): PrincipalDeps {
  const userRepository = new DrizzleUserRepository(db);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(db);
  const principalAuthorizationRepository = new DrizzlePrincipalAuthorizationRepository(db);
  const principalService = createDefaultPrincipalService({
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
  });

  return {
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
    principalService,
  };
}
