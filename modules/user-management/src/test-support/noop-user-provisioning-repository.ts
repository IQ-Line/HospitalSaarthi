import type { User } from "../ports/index.js";
import type {
  ProvisionUserWithAccessInput,
  UserProvisioningRepository,
} from "../ports/user-provisioning-repository.js";

export class NoopUserProvisioningRepository implements UserProvisioningRepository {
  async provisionUserWithAccess(
    _tenantId: string,
    _input: ProvisionUserWithAccessInput,
  ): Promise<User> {
    throw new Error("USER_PROVISIONING_NOT_IMPLEMENTED");
  }
}
