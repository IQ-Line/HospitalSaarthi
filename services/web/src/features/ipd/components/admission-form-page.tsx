import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import {
  FormField,
  FormFieldLabel,
  FormSection,
} from '@/components/form-chrome';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { searchIpdPatients, type EmpiPatient } from '../api/patient-search';
import {
  confirmAdmission,
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
import { EpisodePatientContextBar } from './episode-patient-context-bar';
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
  expectedLosDays: null,
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
    queryFn: () => searchIpdPatients(debouncedPatientQuery, 1, 8),
    enabled: !isEdit && debouncedPatientQuery.trim().length >= 2 && !selectedPatientId,
  });

  useEffect(() => {
    if (admission) form.reset(detailToFormValues(admission));
  }, [admission, form]);

  const saveMutation = useMutation({
    mutationFn: (values: AdmissionFormInput) =>
      isEdit ? updateAdmission(admissionId!, values) : createAdmission(values),
    onSuccess: (result) => {
      toast.success(
        isEdit ? 'Admission updated' : `Admission created · ${result.episodeNumber}`,
      );
      void queryClient.invalidateQueries({ queryKey: ipdQueryKeys.admissions() });
      if (isEdit) {
        void queryClient.invalidateQueries({ queryKey: ipdQueryKeys.admissionDetail(admissionId!) });
      }
      void navigate({ to: '/ipd/admissions' });
    },
    onError: (err) => toast.error(mutationErrorMessage(err)),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmAdmission(admissionId!),
    onSuccess: (result) => {
      toast.success(`Patient admitted · ${result.episodeNumber}`);
      void queryClient.invalidateQueries({ queryKey: ipdQueryKeys.admissions() });
      void queryClient.invalidateQueries({ queryKey: ipdQueryKeys.admissionDetail(admissionId!) });
      void navigate({ to: '/ipd/admissions' });
    },
    onError: (err) => toast.error(mutationErrorMessage(err)),
  });

  const canConfirmAdmission =
    isEdit && admission?.status === 'scheduled' && !!selectedBedId && !form.formState.isDirty;

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
        <FormSection key={ward.id} title={ward.name}>
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
        </FormSection>
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

      {isEdit && admission ? (
        <EpisodePatientContextBar admission={admission} wards={wards} />
      ) : (
        <FormSection title="Patient Information">
          <FormField>
            <FormFieldLabel required>Patient</FormFieldLabel>
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
          </FormField>
        </FormSection>
      )}

      <FormSection title="Admission Details">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['admissionType', 'Admission Type', ADMISSION_TYPES],
              ['admissionSource', 'Admission Source', ADMISSION_SOURCES],
              ['specialty', 'Specialty', ADMISSION_SPECIALTIES],
              ['consultant', 'Consultant', ['dr_demo', 'dr_smith', 'dr_patel']],
            ] as const
          ).map(([name, label, options]) => (
            <FormField key={name}>
              <FormFieldLabel>{label}</FormFieldLabel>
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
            </FormField>
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
      </FormSection>

      <FormSection title="Clinical">
        <div className="grid gap-4 lg:grid-cols-3">
          <FormField className="lg:col-span-2">
            <FormFieldLabel>Provisional Diagnosis</FormFieldLabel>
            <Textarea
              placeholder="Provisional diagnosis..."
              rows={3}
              {...form.register('provisionalDiagnosis')}
            />
          </FormField>
          <div className="space-y-4">
            <FormField>
              <FormFieldLabel>Expected Length of Stay (days)</FormFieldLabel>
              <Input
                type="number"
                min={0}
                placeholder="Days"
                {...form.register('expectedLosDays', {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? null : Number(v)),
                })}
              />
            </FormField>
            <FormField>
              <FormFieldLabel>Ward Preference (Bed Class)</FormFieldLabel>
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
            </FormField>
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
      </FormSection>

      <FormSection title="Bed Assignment">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <BedDouble className="size-4 shrink-0" />
          Select a bed to assign at admission. Select a patient first to see reserved slots.
        </div>
        <div className="grid gap-4 xl:grid-cols-2">{wardGrid}</div>
      </FormSection>

      <FormSection title="Financial">
        <FormField className="max-w-xs">
          <FormFieldLabel>Financial Class</FormFieldLabel>
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
        </FormField>
      </FormSection>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {isEdit && admission?.status === 'scheduled' ? (
          <Button
            type="button"
            disabled={!canConfirmAdmission || confirmMutation.isPending || saveMutation.isPending}
            onClick={() => confirmMutation.mutate()}
          >
            {confirmMutation.isPending ? 'Confirming…' : 'Confirm Admission'}
          </Button>
        ) : null}
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
      {isEdit && admission?.status === 'scheduled' && form.formState.isDirty ? (
        <p className="text-right text-xs text-muted-foreground">
          Save changes before confirming admission.
        </p>
      ) : null}
    </form>
  );
}
