import { useEffect, useMemo, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@pulse/ui/alert';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  doctorConsultationTariffsQueryKey,
  listDoctorConsultationTariffs,
  syncDoctorConsultationTariffs,
  tariffServiceToDoctorRow,
} from '@/features/billing/lib/doctor-consultation-tariff';
import { useDepartments } from '@/features/master-data/api';
import type { Department } from '@/features/master-data/types';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { indianMobileZodFieldOptional, sanitizeIndianMobileInput } from '@/lib/indian-mobile';
import type { UmUser, UpdateUserBody } from '../types';
import { useUpdateUser } from '../api/mutations';
import { roleListOptions, userCapabilitiesOptions, userDetailOptions } from '../api/queries';
import { userManagementKeys } from '../api/keys';
import {
  doctorTariffRowSchema,
  EMPTY_DOCTOR_TARIFF_ROW,
  type DoctorTariffFormRow,
} from '../lib/doctor-tariff-form';
import { isDoctorRole, validateDoctorTariffs } from '../lib/is-doctor-role';
import { userTenantScopeKey } from '../lib/user-tenant-scope';
import { CreateUserDoctorOpdSection } from './create-user-doctor-departments';

const EMPTY_TARIFF_LIST: Awaited<ReturnType<typeof listDoctorConsultationTariffs>> = [];

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.union([z.literal(''), z.string().email('Enter a valid email')]),
  phone: indianMobileZodFieldOptional(),
  username: z.string(),
  department: z.string(),
  doctor_tariffs: z.array(doctorTariffRowSchema).default([]),
});

type FormValues = z.infer<typeof schema>;

function toPatch(values: FormValues, primaryDepartmentName: string | null): UpdateUserBody {
  return {
    full_name: values.full_name,
    email: values.email === '' ? null : values.email ?? null,
    phone: values.phone === '' ? null : values.phone,
    username: values.username === '' ? null : values.username,
    department: primaryDepartmentName,
  };
}

function buildDoctorTariffDefaults(
  tariffs: Awaited<ReturnType<typeof listDoctorConsultationTariffs>>,
  user: UmUser,
  departments: Department[],
): DoctorTariffFormRow[] {
  if (tariffs.length > 0) {
    return tariffs.map(tariffServiceToDoctorRow);
  }
  const deptLabel = user.department?.trim();
  if (deptLabel) {
    const match = departments.find(
      (d) => d.name.trim().toLowerCase() === deptLabel.toLowerCase() ||
        d.code.trim().toLowerCase() === deptLabel.toLowerCase(),
    );
    if (match) {
      return [{ ...EMPTY_DOCTOR_TARIFF_ROW, department_id: match.id }];
    }
  }
  return [{ ...EMPTY_DOCTOR_TARIFF_ROW }];
}

function buildFormValues(
  user: UmUser,
  isDoctor: boolean,
  tariffs: Awaited<ReturnType<typeof listDoctorConsultationTariffs>>,
  departments: Department[],
): FormValues {
  return {
    full_name: user.full_name,
    email: user.email ?? '',
    phone: user.phone ?? '',
    username: user.username ?? '',
    department: user.department ?? '',
    doctor_tariffs: isDoctor ? buildDoctorTariffDefaults(tariffs, user, departments) : [],
  };
}

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UmUser;
  tenantScope?: string;
};

function tariffRowsFingerprint(
  rows: Awaited<ReturnType<typeof listDoctorConsultationTariffs>>,
): string {
  return rows
    .map((t) => {
      const row = tariffServiceToDoctorRow(t);
      return [
        row.service_id ?? '',
        row.department_id,
        row.base_price,
        row.tax_percentage,
        row.room_number,
        ...(row.opd_days ?? []).sort(),
      ].join('|');
    })
    .sort()
    .join(';');
}

export function EditUserDialog({ open, onOpenChange, user, tenantScope }: EditUserDialogProps) {
  const qc = useQueryClient();
  const update = useUpdateUser(user.id, tenantScope);

  const userDetailQuery = useQuery({
    ...userDetailOptions(user.id, tenantScope),
    enabled: open,
  });
  const resolvedUser = userDetailQuery.data ?? user;

  const rolesQuery = useQuery({
    ...roleListOptions(tenantScope),
    enabled: open,
  });
  const capabilitiesQuery = useQuery({
    ...userCapabilitiesOptions(user.id, tenantScope),
    enabled: open,
  });

  const accessContextReady =
    !open || (!rolesQuery.isLoading && !capabilitiesQuery.isLoading);

  const isDoctor = useMemo(() => {
    if (!accessContextReady) return false;
    const roles = rolesQuery.data ?? [];
    const applied = capabilitiesQuery.data?.role_templates ?? [];
    return applied.some((template) => isDoctorRole(template.role_id, roles));
  }, [accessContextReady, capabilitiesQuery.data?.role_templates, rolesQuery.data]);

  const tariffsQueryKey = doctorConsultationTariffsQueryKey(user.id, tenantScope);

  const tariffsQuery = useQuery({
    queryKey: tariffsQueryKey,
    queryFn: () => listDoctorConsultationTariffs(user.id, tenantScope),
    enabled: open && accessContextReady && isDoctor,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const departmentsQuery = useDepartments(undefined, {
    iqTenantId: tenantScope,
    formCatalog: true,
    enabled: open && isDoctor,
  });
  const activeDepartments = useMemo(
    () => (departmentsQuery.data?.data ?? []).filter((d) => d.is_active),
    [departmentsQuery.data],
  );

  const doctorTariffsFailed = isDoctor && tariffsQuery.isError;
  const doctorDataReady =
    !isDoctor ||
    ((tariffsQuery.isFetched || tariffsQuery.isError) && !departmentsQuery.isLoading);

  const formReady = open && accessContextReady && doctorDataReady;

  const doctorTariffsForForm = useMemo(() => {
    if (!isDoctor || doctorTariffsFailed) return EMPTY_TARIFF_LIST;
    return tariffsQuery.data ?? EMPTY_TARIFF_LIST;
  }, [isDoctor, doctorTariffsFailed, tariffsQuery.data]);

  const { reset, handleSubmit, register, control, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildFormValues(user, false, [], []),
  });

  const doctorSectionKey = useMemo(() => {
    if (!formReady || !isDoctor) return 'idle';
    return `${user.id}:${tariffRowsFingerprint(doctorTariffsForForm)}`;
  }, [formReady, isDoctor, doctorTariffsForForm, user.id]);

  useEffect(() => {
    if (!formReady) return;
    reset(buildFormValues(resolvedUser, isDoctor, doctorTariffsForForm, activeDepartments), {
      keepDefaultValues: false,
    });
  }, [
    formReady,
    reset,
    resolvedUser.id,
    resolvedUser.full_name,
    resolvedUser.email,
    resolvedUser.phone,
    resolvedUser.username,
    resolvedUser.department,
    isDoctor,
    doctorSectionKey,
    activeDepartments,
  ]);

  const showDoctorLoading =
    open && accessContextReady && isDoctor && !doctorDataReady;

  const formBusy = update.isPending || showDoctorLoading;

  const onSubmit = handleSubmit(async (values) => {
    if (isDoctor) {
      const tariffError = validateDoctorTariffs(values.doctor_tariffs);
      if (tariffError) {
        setError('doctor_tariffs', { type: 'custom', message: tariffError });
        return;
      }
    }

    const primaryDeptName = isDoctor
      ? (activeDepartments.find((d) => d.id === values.doctor_tariffs[0]?.department_id)?.name ??
        null)
      : (user.department ?? null);

    try {
      const updatedUser = await update.mutateAsync(toPatch(values, primaryDeptName));
      if (isDoctor && values.doctor_tariffs.length > 0 && !doctorTariffsFailed) {
        await syncDoctorConsultationTariffs(
          user.id,
          values.full_name,
          values.doctor_tariffs,
          activeDepartments,
          tenantScope,
        );
        await qc.invalidateQueries({ queryKey: tariffsQueryKey });
        const refreshed = await listDoctorConsultationTariffs(user.id, tenantScope);
        qc.setQueryData(tariffsQueryKey, refreshed);
      }
      qc.setQueryData(
        userManagementKeys.userDetail(user.id, userTenantScopeKey(tenantScope)),
        updatedUser,
      );
      toast.success('Profile updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b p-4 pb-3">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Update contact details
                {isDoctor ? ', consultation departments, OPD days, and room numbers' : ''}.
              </DialogDescription>
            </DialogHeader>
          </div>

          {!formReady ? (
            <div className="flex min-h-[12rem] flex-1 items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">Loading profile details…</p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full name</Label>
                <Input id="edit_full_name" {...register('full_name')} />
                {formState.errors.full_name ? (
                  <p className="text-sm text-destructive">{formState.errors.full_name.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input id="edit_email" type="email" {...register('email')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input
                    id="edit_phone"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    {...register('phone', {
                      onChange: (e: ChangeEvent<HTMLInputElement>) => {
                        e.target.value = sanitizeIndianMobileInput(e.target.value);
                      },
                    })}
                  />
                  {formState.errors.phone ? (
                    <p className="text-sm text-destructive">{formState.errors.phone.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_username">Username</Label>
                  <Input id="edit_username" {...register('username')} />
                </div>
              </div>

              {isDoctor ? (
                <>
                  {doctorTariffsFailed ? (
                    <Alert variant="destructive">
                      <AlertTitle>Could not load consultation tariffs</AlertTitle>
                      <AlertDescription>
                        {tariffsQuery.error instanceof Error
                          ? tariffsQuery.error.message
                          : 'Billing service error.'}{' '}
                        Apply billing migrations:{' '}
                        <code className="text-xs">npx nx run billing:db-migrate</code> (or{' '}
                        <code className="text-xs">make db-migrate</code>), then retry. You can
                        still edit name and contact details below.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <CreateUserDoctorOpdSection
                    key={doctorSectionKey}
                    control={control}
                    errors={formState.errors}
                    iqTenantId={tenantScope}
                    minRows={1}
                  />
                </>
              ) : null}
            </div>
          )}

          <DialogFooter className="shrink-0 border-t p-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formBusy || !formReady}>
              {update.isPending ? 'Saving...' : !formReady ? 'Loading...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
