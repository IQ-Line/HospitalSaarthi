import { getMockOpdPatientsList } from '@/features/opd-patients/mock/opd-patients.mock';
import type { CreateRxVisitContext } from '../types';

/** Resolves visit context from OPD patients mock list by visit id. */
export function getMockCreateRxVisitContext(visitId: string): CreateRxVisitContext | null {
  const { items } = getMockOpdPatientsList({
    page: 1,
    limit: 100,
    filters: {
      search: '',
      startDate: '',
      endDate: '',
      gender: '',
      ageGroup: '',
      visitType: '',
      status: '',
      doctorId: '',
    },
    doctorScope: 'all',
  });

  const row = items.find((r) => r.id === visitId);
  if (!row) return null;

  const nameParts = row.patientName.split(' ');
  const firstName = nameParts[0] ?? row.patientName;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  return {
    patient: {
      id: row.patientId,
      firstName,
      lastName,
      gender: row.gender,
      age: row.age,
      uhid: `2605130000100000${row.patientId.replace(/\D/g, '').padStart(2, '0').slice(-2)}`,
      phone: '8765456789',
      abhaNumber: 'N/A',
      abhaAddress: 'N/A',
    },
    visit: {
      id: row.id,
      visitNumber: row.visitNumber,
      status: row.status,
    },
  };
}
