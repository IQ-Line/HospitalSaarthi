import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useVisitpadVitalsCatalog } from '@/features/visitpad/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useCreateRxStore } from '../create-rx.store';
import { fetchPriorVisitMedicalHistory, type PriorVisitMedicalRecord } from '../api/prior-visit-history';
import {
  formatChiefComplaintsLine,
  formatDiagnosisLine,
  formatMedicineDosageDisplay,
  formatPriorVisitCardDate,
  formatPriorVisitColumnDate,
} from '../lib/prior-visit-preview-formatters';
import {
  vitalPairGroupLabel,
  visitpadVitalsToFieldDefs,
} from '../lib/visitpad-vitals-fields';
import type { VitalFieldDef } from '../types';

const MAX_VITAL_COLUMNS = 4;

function dash(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '-';
}

function vitalDisplayValue(
  vitals: Record<string, string>,
  field: VitalFieldDef,
): string {
  const partnerCode = field.pairedWith;
  if (partnerCode) {
    const primary = vitals[field.code]?.trim();
    const secondary = vitals[partnerCode]?.trim();
    if (primary && secondary) return `${primary}/${secondary}`;
    if (primary || secondary) return primary || secondary || '-';
    return '-';
  }

  return dash(vitals[field.code]);
}

function VitalComparisonTable({ records }: { records: PriorVisitMedicalRecord[] }) {
  const { data: vitalsRes } = useVisitpadVitalsCatalog();
  const context = useCreateRxStore((s) => s.context);
  const patientAge = context?.patient.age;

  const columns = records.slice(0, MAX_VITAL_COLUMNS);
  const vitalFields = useMemo(
    () => visitpadVitalsToFieldDefs(vitalsRes?.data, patientAge),
    [vitalsRes?.data, patientAge],
  );

  const displayFields = useMemo(() => {
    const secondaryCodes = new Set(
      vitalFields.filter((f) => f.pairedWith).map((f) => f.pairedWith!),
    );
    return vitalFields.filter((field) => {
      if (secondaryCodes.has(field.code)) return false;
      return columns.some((visit) => {
        const value = vitalDisplayValue(visit.vitals, field);
        return value !== '-';
      });
    });
  }, [vitalFields, columns]);

  if (columns.length === 0 || displayFields.length === 0) return null;

  return (
    <section className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-gray-900">Vital Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-xs">
          <thead>
            <tr className="bg-[#F1F5F9] text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-2 py-2">Vitals</th>
              {columns.map((visit) => (
                <th key={visit.visitId} className="px-2 py-2 text-center">
                  {formatPriorVisitColumnDate(visit.visitDate)}
                </th>
              ))}
              <th className="px-2 py-2 text-right">Unit</th>
            </tr>
          </thead>
          <tbody>
            {displayFields.map((field) => {
              const partnerCode = field.pairedWith;
              const partner = partnerCode
                ? vitalFields.find((f) => f.code === partnerCode)
                : undefined;
              const label =
                partner != null ? vitalPairGroupLabel(field, partner) : field.label;

              return (
                <tr key={field.code} className="border-t border-gray-100">
                  <td className="px-2 py-2 font-medium text-gray-800">{label}</td>
                  {columns.map((visit) => (
                    <td key={visit.visitId} className="px-2 py-2 text-center tabular-nums text-gray-800">
                      {vitalDisplayValue(visit.vitals, field)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right text-gray-500">{field.unit ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RxTable({ medicines }: { medicines: PriorVisitMedicalRecord['medicines'] }) {
  const rows = medicines.filter((m) => m.medicine?.trim());

  return (
    <div className="mt-3">
      <p className="mb-2 text-sm font-semibold text-gray-800">Rx</p>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#F1F5F9] text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-2 py-2">Medicines</th>
              <th className="px-2 py-2">Strength</th>
              <th className="px-2 py-2">Dosage</th>
              <th className="px-2 py-2">Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-t border-gray-100">
                <td className="px-2 py-2 text-gray-500">-</td>
                <td className="px-2 py-2 text-gray-500">-</td>
                <td className="px-2 py-2 text-gray-500">-</td>
                <td className="px-2 py-2 text-gray-500">-</td>
              </tr>
            ) : (
              rows.map((medicine) => (
                <tr key={medicine.id} className="border-t border-gray-100">
                  <td className="px-2 py-2 text-gray-800">{medicine.medicine}</td>
                  <td className="px-2 py-2 text-gray-800">{dash(medicine.strength)}</td>
                  <td className="px-2 py-2 text-gray-800">{formatMedicineDosageDisplay(medicine)}</td>
                  <td className="px-2 py-2 text-gray-800">{dash(medicine.quantity)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PriorVisitCard({
  record,
  patientId,
}: {
  record: PriorVisitMedicalRecord;
  patientId: string;
}) {
  const complaintsLine = formatChiefComplaintsLine(record.chiefComplaints);
  const diagnosisLine = formatDiagnosisLine(record.diagnosis);

  return (
    <article className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{formatPriorVisitCardDate(record.visitDate)}</p>
      <Link
        to="/create-rx/$visitId"
        params={{ visitId: record.visitId }}
        search={{ mode: 'view', loadPrescription: true, patientId }}
        className="mt-1 inline-block text-sm font-medium text-[#2563EB] hover:underline"
      >
        {record.visitNumber}
      </Link>

      {complaintsLine ? (
        <p className="mt-3 text-sm leading-relaxed text-gray-800">{complaintsLine}</p>
      ) : null}

      <div className="mt-3">
        <p className="text-sm font-semibold text-gray-800">Diagnosis</p>
        <p className="mt-1 text-sm text-gray-700">{diagnosisLine}</p>
      </div>

      <RxTable medicines={record.medicines} />
    </article>
  );
}

export function PriorMedicalHistoryPreview() {
  const context = useCreateRxStore((s) => s.context);
  const priorVisitSearch = useCreateRxStore((s) => s.priorVisitSearch);
  const debouncedSearch = useDebouncedValue(priorVisitSearch, 300);

  const patientId = context?.patient.id ?? '';
  const currentVisitId = context?.visit.id ?? '';

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['create-rx', 'prior-visit-history', patientId, currentVisitId],
    queryFn: () => fetchPriorVisitMedicalHistory(patientId, currentVisitId),
    enabled: Boolean(patientId && currentVisitId),
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => r.visitNumber.toLowerCase().includes(q));
  }, [records, debouncedSearch]);

  if (!patientId) {
    return (
      <div className="flex min-h-[200px] flex-1 items-center justify-center bg-[#EEF2F6] p-6">
        <p className="text-sm text-gray-500">Open a patient visit to view prior medical history.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] flex-1 items-center justify-center bg-[#EEF2F6] p-6">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-1 items-center justify-center bg-[#EEF2F6] p-6">
        <p className="text-sm text-gray-500">
          {records.length === 0
            ? 'No prior visit medical history found for this patient.'
            : 'No visits match the search.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#EEF2F6] p-3">
      <div className="space-y-3">
        <VitalComparisonTable records={filtered} />
        {filtered.map((record) => (
          <PriorVisitCard key={record.visitId} record={record} patientId={patientId} />
        ))}
      </div>
    </div>
  );
}
