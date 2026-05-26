import type { ParchaStorePort } from '../ports.js';
import type { ParchaPageDto } from '../types.js';

export class MemoryParchaStore implements ParchaStorePort {
  private readonly map = new Map<string, ParchaPageDto[]>();

  async save(
    visitId: string,
    pages: ParchaPageDto[],
    _meta: { doctorId: string; patientId: string },
  ): Promise<void> {
    this.map.set(visitId, pages);
  }

  async get(visitId: string): Promise<ParchaPageDto[] | null> {
    return this.map.get(visitId) ?? null;
  }
}
