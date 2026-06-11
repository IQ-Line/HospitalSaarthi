import type { UserRepository } from "@hims/user-management";
import type { UserLookupPort } from "@hims/pharmacy";

export function createPharmacyUserLookup(userRepository: UserRepository): UserLookupPort {
  return {
    async resolveDoctorNames(tenantId, userIds) {
      const map = new Map<string, string>();
      const results = await Promise.allSettled(
        userIds.map(async (userId) => {
          const user = await userRepository.getUserById(tenantId, userId);
          return { userId, fullName: user?.full_name?.trim() ?? "" };
        }),
      );

      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const { userId, fullName } = result.value;
        if (fullName.length > 0) {
          map.set(userId, fullName);
        }
      }

      return map;
    },
  };
}
