import { UnexpectedPersistenceError } from "../domain/errors.js";
import type { InMemoryUserAccessRepository } from "./in-memory-user-access-repository.js";
import type { InMemoryUserRepository } from "./in-memory-user-repository.js";
import type {
  ProvisionUserWithAccessInput,
  UserProvisioningRepository,
} from "../ports/user-provisioning-repository.js";
import type { User } from "../ports/index.js";

type UserSnapshot = Map<string, unknown>;
type AccessSnapshot = {
  roleTemplates: Map<string, unknown>;
  capabilityGrants: Map<string, Map<string, unknown>>;
};

function snapshotUsers(repo: InMemoryUserRepository): UserSnapshot {
  return new Map((repo as unknown as { users: UserSnapshot }).users);
}

function restoreUsers(repo: InMemoryUserRepository, snapshot: UserSnapshot): void {
  const users = (repo as unknown as { users: UserSnapshot }).users;
  users.clear();
  for (const [key, value] of snapshot) {
    users.set(key, value);
  }
}

function snapshotAccess(repo: InMemoryUserAccessRepository): AccessSnapshot {
  const inner = repo as unknown as AccessSnapshot;
  return {
    roleTemplates: new Map(inner.roleTemplates),
    capabilityGrants: new Map(
      [...inner.capabilityGrants.entries()].map(([key, grants]) => [key, new Map(grants)]),
    ),
  };
}

function restoreAccess(repo: InMemoryUserAccessRepository, snapshot: AccessSnapshot): void {
  const inner = repo as unknown as AccessSnapshot;
  inner.roleTemplates = snapshot.roleTemplates;
  inner.capabilityGrants = snapshot.capabilityGrants;
}

export class InMemoryUserProvisioningRepository implements UserProvisioningRepository {
  constructor(
    private readonly userRepository: InMemoryUserRepository,
    private readonly userAccessRepository: InMemoryUserAccessRepository,
  ) {}

  async provisionUserWithAccess(
    tenantId: string,
    input: ProvisionUserWithAccessInput,
  ): Promise<User> {
    const userSnap = snapshotUsers(this.userRepository);
    const accessSnap = snapshotAccess(this.userAccessRepository);

    try {
      const user = this.userRepository.insertUserWithId(tenantId, input.userId, input.user);
      const linked = await this.userRepository.updateUser(tenantId, user.id, {
        auth_user_id: input.authUserId,
      });
      if (linked === null) {
        throw new UnexpectedPersistenceError();
      }

      if (input.manualCapabilityIds.length > 0) {
        await this.userAccessRepository.replaceManualCapabilityGrants(tenantId, {
          userId: linked.id,
          capabilityIds: input.manualCapabilityIds,
          actorId: input.actorId,
        });
      }

      for (const grant of input.roleTemplateGrants) {
        await this.userAccessRepository.applyRoleTemplate(tenantId, {
          userId: linked.id,
          roleId: grant.roleId,
          capabilityIds: grant.capabilityIds,
          actorId: input.actorId,
        });
      }

      return linked;
    } catch (error) {
      restoreUsers(this.userRepository, userSnap);
      restoreAccess(this.userAccessRepository, accessSnap);
      throw error;
    }
  }
}
