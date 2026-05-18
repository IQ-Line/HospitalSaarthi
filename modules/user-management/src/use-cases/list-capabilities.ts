import type { Capability, CapabilityRepository } from "../ports/index.js";

export type ListCapabilitiesDeps = {
  capabilityRepository: CapabilityRepository;
};

export async function listCapabilities(
  deps: ListCapabilitiesDeps,
): Promise<Capability[]> {
  return deps.capabilityRepository.listCapabilities();
}
