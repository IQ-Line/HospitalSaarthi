import type { Capability, CapabilityRepository } from "../ports/index.js";

export type GetCapabilityDeps = {
  capabilityRepository: CapabilityRepository;
};

export async function getCapabilityById(
  deps: GetCapabilityDeps,
  capabilityId: string,
): Promise<Capability | null> {
  return deps.capabilityRepository.getCapabilityById(capabilityId);
}
