import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Printer,
} from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm, useWatch, type SubmitHandler, type UseFormRegister } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { createNewPatientRegistration, listRegistrations } from '@/features/frontdesk/api/registrations';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';
import {
  ageYmdSinceBirth,
  EMPI_BLOOD_GROUP_OPTIONS,
  mapVisitRegistrationToNewPatientIntakeBody,
  parseDateOnly,
  startOfLocalDay,
} from '@/features/frontdesk/utils/visit-registration-helpers';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated/frontdesk/visit-registration')({
  component: VisitRegistrationRoute,
});

const defaultAddress = (): CreateVisitRequestBody['permanent_address'] => ({
  line1: '',
  line2: '',
  city: '',
  state: '',
  district: '',
  pincode: '',
});

type FormValues = CreateVisitRequestBody;

function VisitRegistrationRoute() {
  const tenantName = useTenantStore((s) => s.tenantName);
  const branches = useTenantStore((s) => s.branches);
  const activeBranch = useTenantStore((s) => s.activeBranch);
  const branchName =
    branches.find((b) => b.id === activeBranch)?.name ?? 'Main branch';
  const branchLabel = [tenantName, branchName].filter(Boolean).join(' — ') || 'Noida — Main Branch';

  const [showExtendedPatient, setShowExtendedPatient] = useState(false);
  const [openAdditional, setOpenAdditional] = useState(false);
  const [openVisitDetails, setOpenVisitDetails] = useState(false);
  const [phase, setPhase] = useState<'list' | 'form'>('list');
  const [draftUhid, setDraftUhid] = useState('');
  const [draftMobile, setDraftMobile] = useState('');
  const [draftName, setDraftName] = useState('');
  const [appliedSearch, setAppliedSearch] = useState({ uhid: '', mobile: '', name: '' });
  const [listPage, setListPage] = useState(1);
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: [
      'registrations',
      'list',
      listPage,
      appliedSearch.uhid,
      appliedSearch.mobile,
      appliedSearch.name,
    ],
    queryFn: () =>
      listRegistrations({
        page: listPage,
        limit: 10,
        uhid: appliedSearch.uhid || undefined,
        mobile: appliedSearch.mobile || undefined,
        name: appliedSearch.name || undefined,
      }),
    enabled: phase === 'list',
  });

  const applyListFilters = () => {
    setAppliedSearch({
      uhid: draftUhid.trim(),
      mobile: draftMobile.trim(),
      name: draftName.trim(),
    });
    setListPage(1);
  };

  const form = useForm<FormValues>({
    defaultValues: {
      branch_id: null,
      patient: {
        phone: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: 'male',
        date_of_birth: '',
        age_years: null,
        age_months: null,
        age_days: null,
        email: '',
        blood_group: '',
        abha_number: '',
      },
      attendant: {
        relation: 'Father',
        name: '',
        phone: '',
      },
      permanent_address: defaultAddress(),
      residential_address: defaultAddress(),
      residential_same_as_permanent: true,
      other: {
        education: '',
        occupation: '',
        religion: '',
      },
      notes: {
        referral: '',
        additional: '',
      },
    },
  });

  const dateOfBirth = useWatch({ control: form.control, name: 'patient.date_of_birth' });

  useEffect(() => {
    const raw = (dateOfBirth ?? '').trim();
    if (!raw) {
      form.setValue('patient.age_years', null, { shouldValidate: false });
      form.setValue('patient.age_months', null, { shouldValidate: false });
      form.setValue('patient.age_days', null, { shouldValidate: false });
      return;
    }

    const birth = parseDateOnly(raw);
    if (!birth) return;

    const todayStart = startOfLocalDay(new Date());
    const birthStart = startOfLocalDay(birth);
    if (birthStart > todayStart) {
      form.setValue('patient.age_years', null, { shouldValidate: false });
      form.setValue('patient.age_months', null, { shouldValidate: false });
      form.setValue('patient.age_days', null, { shouldValidate: false });
      return;
    }

    const { years, months, days } = ageYmdSinceBirth(birthStart, todayStart);
    form.setValue('patient.age_years', years, { shouldValidate: false });
    form.setValue('patient.age_months', months, { shouldValidate: false });
    form.setValue('patient.age_days', days, { shouldValidate: false });
  }, [dateOfBirth, form]);

  const watchSame = form.watch('residential_same_as_permanent');
  const patientBloodGroup = form.watch('patient.blood_group');

  const {
    ref: patientPhoneRef,
    onChange: patientPhoneRhfOnChange,
    onBlur: patientPhoneOnBlur,
    name: patientPhoneName,
  } = form.register('patient.phone', {
    required: 'Phone number is required',
    pattern: {
      value: /^\d{10}$/,
      message: 'Enter a 10-digit mobile number (digits only)',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateVisitRequestBody) =>
      createNewPatientRegistration(mapVisitRegistrationToNewPatientIntakeBody(data)),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['registrations', 'list'] });
      if (res.patient_uhid) {
        toast.success(`Registration saved — UHID ${res.patient_uhid}`);
      } else {
        toast.success('Registration saved.');
      }
      setPhase('list');
    },
    onError: (err) => {
      toast.error(mutationErrorMessage(err));
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const payload: CreateVisitRequestBody = {
      ...data,
      residential_address: data.residential_same_as_permanent
        ? { ...data.permanent_address }
        : data.residential_address,
    };
    mutation.mutate(payload);
  };

  return (
    <div className="min-h-full">
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-2.5rem)]">
        <div className="flex-1 p-6 space-y-6 border-r border-border">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {phase === 'list' ? 'Visit registrations' : 'New visit registration'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Building2 className="size-4 shrink-0" />
                {branchLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {phase === 'form' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPhase('list')}
                >
                  <ArrowLeft className="size-4 shrink-0" />
                  Back to list
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" disabled>
                Customize sections
              </Button>
              <Button type="button" variant="outline" size="sm" disabled>
                Patient Queue
              </Button>
              {phase === 'list' ? (
                <Button type="button" size="sm" onClick={() => setPhase('form')}>
                  + New registration
                </Button>
              ) : null}
            </div>
          </header>

          {phase === 'list' ? (
            <div className="space-y-4 rounded-lg border border-border bg-card p-4 md:p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Patient search (UHID / mobile / name)
              </h2>
              <p className="text-xs text-muted-foreground">
                Name search requires at least two characters (EMPI). Results are encounter registrations
                for matching patients, newest first.
              </p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
                <div className="space-y-2">
                  <Label htmlFor="reg-list-uhid">UHID</Label>
                  <Input
                    id="reg-list-uhid"
                    value={draftUhid}
                    onChange={(e) => setDraftUhid(e.target.value)}
                    placeholder="Exact UHID"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-list-mobile">Mobile</Label>
                  <Input
                    id="reg-list-mobile"
                    value={draftMobile}
                    onChange={(e) => setDraftMobile(e.target.value)}
                    placeholder="As stored in EMPI"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-list-name">Name</Label>
                  <Input
                    id="reg-list-name"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Min. 2 characters when used"
                    autoComplete="off"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="w-full lg:w-auto" onClick={applyListFilters}>
                    Apply filters
                  </Button>
                </div>
              </div>

              {listQuery.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  {mutationErrorMessage(listQuery.error)}
                </p>
              ) : null}

              {listQuery.isFetching ? (
                <p className="text-sm text-muted-foreground">Loading registrations…</p>
              ) : null}

              {!listQuery.isFetching && listQuery.data ? (
                <>
                  <div className="rounded-md border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Registered</TableHead>
                          <TableHead>UHID</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Visit type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listQuery.data.data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No registrations match these filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          listQuery.data.data.map((row) => (
                            <TableRow key={row.registration_id}>
                              <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                                {new Date(row.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell className="font-medium tabular-nums">
                                {row.patient_uhid ?? '—'}
                              </TableCell>
                              <TableCell>{row.patient_full_name ?? '—'}</TableCell>
                              <TableCell className="tabular-nums">{row.patient_phone_number ?? '—'}</TableCell>
                              <TableCell>{row.registration_status}</TableCell>
                              <TableCell>{row.visit_type ?? '—'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Page {listQuery.data.page} of {Math.max(1, listQuery.data.total_pages)} —{' '}
                      {listQuery.data.total} total
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={listPage <= 1 || listQuery.isFetching}
                        onClick={() => setListPage((p) => Math.max(1, p - 1))}
                        className="gap-1"
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          listQuery.data.total_pages === 0 ||
                          listPage >= listQuery.data.total_pages ||
                          listQuery.isFetching
                        }
                        onClick={() => setListPage((p) => p + 1)}
                        className="gap-1"
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {phase === 'form' ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Patient details
              </h2>
              <div className="space-y-2">
                <Label htmlFor="visit-reg-phone">Phone number</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-10 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-sm tabular-nums">
                    +91
                  </span>
                  <Input
                    id="visit-reg-phone"
                    name={patientPhoneName}
                    ref={patientPhoneRef}
                    onBlur={patientPhoneOnBlur}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const el = e.target;
                      el.value = el.value.replace(/\D/g, '').slice(0, 10);
                      void patientPhoneRhfOnChange(e);
                    }}
                    className="h-10 min-w-[10rem] flex-1 md:max-w-md"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="10-digit mobile"
                  />
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 shrink-0 px-3"
                      disabled
                    >
                      Verify ABHA
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 shrink-0 px-3"
                      disabled
                    >
                      Create ABHA
                    </Button>
                  </div>
                </div>
                {form.formState.errors.patient?.phone && (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.patient.phone.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>
                    First name <span className="text-destructive">*</span>
                  </Label>
                  <Input {...form.register('patient.first_name', { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Middle name</Label>
                  <Input {...form.register('patient.middle_name')} />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input {...form.register('patient.last_name')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex flex-wrap gap-2">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      size="sm"
                      variant={form.watch('patient.gender') === g ? 'default' : 'outline'}
                      className="capitalize"
                      onClick={() => form.setValue('patient.gender', g)}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4">
                <div className="space-y-2 sm:col-span-3 lg:col-span-1">
                  <Label htmlFor="visit-reg-dob">Date of birth</Label>
                  <div className="relative">
                    <Input
                      id="visit-reg-dob"
                      type="date"
                      className="h-10 w-full pr-10"
                      {...form.register('patient.date_of_birth')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-reg-age-yrs">Yrs</Label>
                  <Input
                    id="visit-reg-age-yrs"
                    type="number"
                    min={0}
                    className="h-10"
                    {...form.register('patient.age_years', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-reg-age-mon">Mon</Label>
                  <Input
                    id="visit-reg-age-mon"
                    type="number"
                    min={0}
                    max={11}
                    className="h-10"
                    {...form.register('patient.age_months', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-reg-age-days">Days</Label>
                  <Input
                    id="visit-reg-age-days"
                    type="number"
                    min={0}
                    max={31}
                    className="h-10"
                    {...form.register('patient.age_days', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" {...form.register('patient.email')} />
                </div>
                <div className="space-y-2">
                  <Label>Blood group</Label>
                  <Select
                    value={patientBloodGroup ? patientBloodGroup : '__none__'}
                    onValueChange={(v: string) =>
                      form.setValue('patient.blood_group', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {EMPI_BLOOD_GROUP_OPTIONS.map((bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <button
                type="button"
                className="text-sm text-primary hover:underline flex items-center gap-1"
                onClick={() => setShowExtendedPatient((v) => !v)}
              >
                {showExtendedPatient ? (
                  <>
                    <ChevronDown className="size-4" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronRight className="size-4" /> Show more (UHID / ABHA)
                  </>
                )}
              </button>
              {showExtendedPatient && (
                <div className="grid gap-4 md:grid-cols-2 border-t border-border pt-4">
                  <div className="space-y-2">
                    <Label>UHID</Label>
                    <Input disabled placeholder="Auto-generated on save" className="opacity-70" />
                  </div>
                  <div className="space-y-2">
                    <Label>ABHA number</Label>
                    <Input {...form.register('patient.abha_number')} placeholder="Dummy" />
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Attendant details
              </h2>
              <p className="text-xs text-muted-foreground">
                Dummy fields until attendant workflow is integrated.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Relation to patient</Label>
                  <Select
                    value={form.watch('attendant.relation')}
                    onValueChange={(v: string) => form.setValue('attendant.relation', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Father', 'Mother', 'Spouse', 'Sibling', 'Other'].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Attendant name</Label>
                  <Input {...form.register('attendant.name')} />
                </div>
                <div className="space-y-2">
                  <Label>Attendant phone</Label>
                  <Input {...form.register('attendant.phone')} />
                </div>
              </div>
            </section>

            <AddressBlock title="Permanent address" prefix="permanent_address" register={form.register} />

            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <Checkbox
                id="same-perm"
                checked={watchSame}
                onCheckedChange={(c: boolean | 'indeterminate') =>
                  form.setValue('residential_same_as_permanent', c === true)
                }
              />
              <Label htmlFor="same-perm" className="font-normal cursor-pointer">
                Same as permanent address
              </Label>
            </div>

            {!watchSame && (
              <AddressBlock title="Residential address" prefix="residential_address" register={form.register} />
            )}

            <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Other details
              </h2>
              <p className="text-xs text-muted-foreground">
                Education, occupation, religion — dummy until captured on patient / visit API.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Education</Label>
                  <Input {...form.register('other.education')} />
                </div>
                <div className="space-y-2">
                  <Label>Occupation</Label>
                  <Input {...form.register('other.occupation')} />
                </div>
                <div className="space-y-2">
                  <Label>Religion</Label>
                  <Input {...form.register('other.religion')} />
                </div>
              </div>
            </section>

            <CollapsibleSection
              title="Additional registration (Visit registration extensions)"
              open={openAdditional}
              onToggle={() => setOpenAdditional((o) => !o)}
            />
            <CollapsibleSection
              title="Visit details"
              open={openVisitDetails}
              onToggle={() => setOpenVisitDetails((o) => !o)}
            />

            <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Notes</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Referral / source notes</Label>
                  <Input {...form.register('notes.referral')} placeholder="Referring doctor or camp name" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Additional notes</Label>
                  <textarea
                    className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    {...form.register('notes.additional')}
                    placeholder="Anything else to capture for this registration"
                  />
                </div>
              </div>
            </section>

            <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-background/90 backdrop-blur-sm py-4 md:flex-row md:items-center md:justify-between supports-[backdrop-filter]:bg-background/80">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled>
                  <Printer className="size-4 mr-1" />
                  Print Patient ID
                </Button>
                <Button type="button" variant="outline" size="sm" disabled>
                  <Printer className="size-4 mr-1" />
                  Print Visit Form
                </Button>
                <span className="text-sm text-muted-foreground ml-2">Total: ₹100</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => form.reset()} disabled={mutation.isPending}>
                  Clear
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving…' : 'Create registration'}
                </Button>
                <Button type="button" variant="secondary" disabled>
                  Save &amp; Print Labels
                </Button>
              </div>
            </footer>
          </form>
          ) : null}
        </div>

        <aside className="w-full lg:w-72 shrink-0 p-6 bg-muted/30 border-t lg:border-t-0 lg:border-l border-border">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="size-4" />
                Today&apos;s visits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatRow label="Total visits" value="98" />
              <StatRow label="Doctor consultations pending" value="40" accent="warning" />
              <StatRow label="Doctor consultations done" value="58" accent="success" />
              <p className="text-xs text-muted-foreground pt-2">
                Summary is placeholder data until visit list API is wired.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'warning' | 'success';
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          accent === 'warning'
            ? 'font-semibold text-amber-700'
            : accent === 'success'
              ? 'font-semibold text-emerald-700'
              : 'font-medium'
        }
      >
        {value}
      </span>
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
      >
        {title}
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          Placeholder — fields will map to visit extensions when APIs are available.
        </div>
      )}
    </div>
  );
}

function AddressBlock({
  title,
  prefix,
  register,
}: {
  title: string;
  prefix: 'permanent_address' | 'residential_address';
  register: UseFormRegister<FormValues>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Address line 1</Label>
          <Input {...register(`${prefix}.line1`)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Address line 2</Label>
          <Input {...register(`${prefix}.line2`)} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input {...register(`${prefix}.city`)} />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Input {...register(`${prefix}.state`)} />
        </div>
        <div className="space-y-2">
          <Label>District</Label>
          <Input {...register(`${prefix}.district`)} />
        </div>
        <div className="space-y-2">
          <Label>Pincode</Label>
          <Input {...register(`${prefix}.pincode`)} />
        </div>
      </div>
    </section>
  );
}
