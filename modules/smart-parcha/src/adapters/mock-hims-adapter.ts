import type { HimsPort } from '../ports.js';
import type { FullContextDto, RequestContext } from '../types.js';

const store = new Map<string, FullContextDto>();

function demo(visitId: string): FullContextDto {
  return {
    patient: {
      _id: 'demo-patient',
      firstName: 'Demo',
      lastName: 'Patient',
      gender: 'male',
      dateOfBirth: '1990-01-01',
      phoneNumber: '9999999999',
      uhid: 'UHID-DEMO-001',
      abhaAddress: 'demo@sbx',
    },
    visit: {
      _id: visitId,
      visitNumber: 'OP-DEMO-001',
      patient: 'demo-patient',
      status: 'in-progress',
      createdAt: new Date().toISOString(),
      vitalsV2: [
        { code: 'bp_systolic', value: '120' },
        { code: 'bp_diastolic', value: '80' },
      ],
    },
    visits: [],
    prescription: null,
    immunizations: [],
    aiPrescription: null,
    smartParcha: null,
    resumedSameDay: false,
    isAddendum: false,
  };
}

export class MockHimsAdapter implements HimsPort {
  async getFullContextDelegated(
    visitId: string,
    _ctx: RequestContext,
    _opts: { addendum: boolean },
  ): Promise<FullContextDto> {
    if (!store.has(visitId)) store.set(visitId, demo(visitId));
    return structuredClone(store.get(visitId)!);
  }

  async savePrescriptionDraft(
    visitId: string,
    prescription: Record<string, unknown>,
    immunizations: unknown[] | undefined,
  ): Promise<unknown> {
    const ctx = store.get(visitId) ?? demo(visitId);
    ctx.prescription = prescription;
    if (immunizations) ctx.immunizations = immunizations;
    store.set(visitId, ctx);
    return { saved: true };
  }

  async endConsultation(visitId: string, body: Record<string, unknown>): Promise<unknown> {
    const ctx = store.get(visitId) ?? demo(visitId);
    if (body.prescription) ctx.prescription = body.prescription as Record<string, unknown>;
    ctx.visit.status = 'completed';
    ctx.visit.completedAt = new Date().toISOString();
    store.set(visitId, ctx);
    return { success: true, data: {} };
  }

  async postConsultation(): Promise<unknown> {
    return { ok: true };
  }
}
