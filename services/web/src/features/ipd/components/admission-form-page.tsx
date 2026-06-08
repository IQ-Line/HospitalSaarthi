import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, BedDouble, Search } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Skeleton } from '@pulse/ui/skeleton';
import { Textarea } from '@pulse/ui/textarea';
import { PageHeader } from '@/components/page-header';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  searchEmpiPatients,
  type EmpiPatient,
} from '@/features/opd-patients/api/empi-patients';
import {
  RegistrationField,
  RegistrationFieldLabel,
  RegistrationSection,
} from '@/features/frontdesk/components/registration-form-chrome';
import {
  createAdmission,
  fetchAdmissionById,
  fetchWardBeds,
  updateAdmission,
} from '../api/admissions';
import { ipdQueryKeys } from '../api/query-keys';
import {
  ADMISSION_FLAGS,
  ADMISSION_SOURCES,
  ADMISSION_SPECIALTIES,
  ADMISSION_TYPES,
  BED_CLASSES,
  FINANCIAL_CLASSES,
} from '../lib/display';
import type { AdmissionFormInput } from '../types';
import { cn } from '@pulse/utils';

const defaultValues = (): AdmissionFormInput => ({
  patientId: '',
  patientLabel: '',
  admissionType: '',
  admissionSource: '',
  specialty: '',
  consultant: '',
  dayCare: false,
  mlc: false,
  provisionalDiagnosis: '',
  expectedLosDays: '',
  wardPreference: 'any',
  flags: [],
  bedId: '',
  financialClass: '',
});

function formatPatientOption(p: EmpiPatient): string {
  return `${p.full_name} · ${p.uhid}`;
}

function detailToFormValues(detail: NonNullable<Awaited<ReturnType<typeof fetchAdmissionById>>>): AdmissionFormInput {
  return {
    patientId: detail.patientId,
    patientLabel: detail.patientLabel,
    admissionType: detail.admissionType,
    admissionSource: detail.admissionSource,
    specialty: detail.specialty,
    consultant: detail.consultant,
    dayCare: detail.dayCare,
    mlc: detail.mlc,
    provisionalDiagnosis: detail.provisionalDiagnosis,
    expectedLosDays: detail.expectedLosDays,
    wardPreference: detail.wardPreference,
    flags: detail.flags,
    bedId: detail.bedId,
    financialClass: detail.financialClass,
  };
}

type AdmissionFormPageProps = {
  admissionId?: string;
};

export function AdmissionFormPage({ admissionId }: AdmissionFormPageProps) {
  const isEdit = !!admissionId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<AdmissionFormInput>({ defaultValues: defaultValues() });
  const [patientQuery, setPatientQuery] = useState('');
  const debouncedPatientQuery = useDebouncedValue(patientQuery, 350);
  const selectedPatientId = form.watch('patientId');
  const selectedBedId = form.watch('bedId');
  const flags = form.watch('flags');

  const { data: admission, isLoading: admissionLoading, isError } = useQuery({
    queryKey: ipdQueryKeys.admissionDetail(admissionId ?? ''),
    queryFn: () => fetchAdmissionById(admissionId!),
    enabled: isEdit,
  });

  const { data: wards = [] } = useQuery({
    queryKey: ipdQueryKeys.wards(),
    queryFn: fetchWardBeds,
  });

  const { data: patientResults } = useQuery({
    queryKey: ['ipd', 'patient-search', debouncedPatientQuery],
    queryFn: () =>
      searchEmpiPatients(
        {
          search: debouncedPatientQuery,
          status: '',
          gender: '',
          ageGroup: '',
          visitType: '',
          startDate: '',
          endDate: '',
          doctorId: '',
        },
        1,
        8,
      ),
    enabled: debouncedPatientQuery.trim().length >= 2 && !selectedPatientId,
  });

  useEffect(() => {
    if (admission) form.reset(detailToFormValues(admission));
  }, [admission, form]);

  const saveMutation = useMutation({
    mutationFn: (values: AdmissionFormInput) =>
      isEdit ? updateAdmission(admissionId!, values) : createAdmission(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ipdQueryKeys.admissions() });
      if (isEdit) {
        void queryClient.invalidateQueries({ queryKey: ipdQueryKeys.admissionDetail(admissionId!) });
      }
      void navigate({ to: '/ipd/admissions' });
    },
  });

  const toggleFlag = (flag: string, checked: boolean) => {
    const next = checked ? [...flags, flag] : flags.filter((f) => f !== flag);
    form.setValue('flags', next);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (!values.patientId) return;
    saveMutation.mutate(values);
  });

  const wardGrid = useMemo(
    () =>
      wards.map((ward) => (
        <RegistrationSection key={ward.id} title={ward.name}>
          <div className="flex flex-wrap gap-2">
            {ward.beds.map((bed) => {
              const active = selectedBedId === bed.id;
              return (
                <button
                  key={bed.id}
                  type="button"
                  onClick={() => form.setValue('bedId', bed.id)}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted/50',
                  )}
                >
                  <span className="block font-medium">{bed.label}</span>
                  <span className="text-muted-foreground">{bed.class}</span>
                </button>
              );
            })}
          </div>
        </RegistrationSection>
      )),
    [wards, selectedBedId, form],
  );

  if (isEdit && admissionLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isEdit && (isError || !admission)) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <PageHeader title="Admission not found" />
        <Button asChild variant="outline">
          <Link to="/ipd/admissions">Back to queue</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4 p-4 md:p-6" onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? 'Edit Admission' : 'New Admission'}
        description={isEdit ? admission?.episodeNumber : undefined}
        actions={
          <Button type="button" variant="outline" asChild className="gap-1.5">
            <Link to="/ipd/admissions">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />

      <RegistrationSection title="Patient Information">
        <RegistrationField>
          <RegistrationFieldLabel required>Patient</RegistrationFieldLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, ABHA, UHID, or phone..."
              value={selectedPatientId ? form.watch('patientLabel') : patientQuery}
              onChange={(e) => {
                setPatientQuery(e.target.value);
                form.setValue('patientId', '');
                form.setValue('patientLabel', '');
              }}
              className="pl-9"
            />
            {!selectedPatientId && (patientResults?.data.length ?? 0) > 0 ? (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
                {patientResults!.data.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        form.setValue('patientId', p.id);
                        form.setValue('patientLabel', formatPatientOption(p));
                        setPatientQuery('');
                      }}
                    >
                      {formatPatientOption(p)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </RegistrationField>
      </RegistrationSection>

      <RegistrationSection title="Admission Details">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['admissionType', 'Admission Type', ADMISSION_TYPES],
              ['admissionSource', 'Admission Source', ADMISSION_SOURCES],
              ['specialty', 'Specialty', ADMISSION_SPECIALTIES],
              ['consultant', 'Consultant', ['dr_demo', 'dr_smith', 'dr_patel']],
            ] as const
          ).map(([name, label, options]) => (
            <RegistrationField key={name}>
              <RegistrationFieldLabel>{label}</RegistrationFieldLabel>
              <Select value={form.watch(name) || undefined} onValueChange={(v) => form.setValue(name, v)}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </RegistrationField>
          ))}
        </div>
        <div className="flex flex-wrap gap-6 pt-2">
          {(
            [
              ['dayCare', 'Day Care Admission'],
              ['mlc', 'Medico-Legal Case (MLC)'],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.watch(name)}
                onCheckedChange={(v) => form.setValue(name, v === true)}
              />
              {label}
            </label>
          ))}
        </div>
      </RegistrationSection>

      <RegistrationSection title="Clinical">
        <div className="grid gap-4 lg:grid-cols-3">
          <RegistrationField className="lg:col-span-2">
            <RegistrationFieldLabel>Provisional Diagnosis</RegistrationFieldLabel>
            <Textarea
              placeholder="Provisional diagnosis..."
              rows={3}
              {...form.register('provisionalDiagnosis')}
            />
          </RegistrationField>
          <div className="space-y-4">
            <RegistrationField>
              <RegistrationFieldLabel>Expected Length of Stay (days)</RegistrationFieldLabel>
              <Input type="number" min={0} placeholder="Days" {...form.register('expectedLosDays')} />
            </RegistrationField>
            <RegistrationField>
              <RegistrationFieldLabel>Ward Preference (Bed Class)</RegistrationFieldLabel>
              <Select
                value={form.watch('wardPreference')}
                onValueChange={(v) => form.setValue('wardPreference', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {BED_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === 'any' ? 'Any' : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </RegistrationField>
          </div>
        </div>
        <div>
          <Label className="text-sm">Admission Flags</Label>
          <div className="mt-2 flex flex-wrap gap-4">
            {ADMISSION_FLAGS.map((flag) => (
              <label key={flag} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={flags.includes(flag)}
                  onCheckedChange={(v) => toggleFlag(flag, v === true)}
                />
                {flag}
              </label>
            ))}
          </div>
        </div>
      </RegistrationSection>

      <RegistrationSection title="Bed Assignment">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <BedDouble className="size-4 shrink-0" />
          Select a bed to assign at admission. Select a patient first to see reserved slots.
        </div>
        <div className="grid gap-4 xl:grid-cols-2">{wardGrid}</div>
      </RegistrationSection>

      <RegistrationSection title="Financial">
        <RegistrationField className="max-w-xs">
          <RegistrationFieldLabel>Financial Class</RegistrationFieldLabel>
          <Select
            value={form.watch('financialClass') || undefined}
            onValueChange={(v) => form.setValue('financialClass', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {FINANCIAL_CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RegistrationField>
      </RegistrationSection>

      <div className="flex justify-end">
        <Button type="submit" disabled={!selectedPatientId || saveMutation.isPending}>
          {saveMutation.isPending
            ? isEdit
              ? 'Saving…'
              : 'Creating…'
            : isEdit
              ? 'Save Changes'
              : 'Create Admission'}
        </Button>
      </div>
    </form>
  );
}
