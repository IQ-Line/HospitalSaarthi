import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import { Input } from '@pulse/ui/input';
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
import { Textarea } from '@pulse/ui/textarea';
import { cn } from '@pulse/utils';
import { FormField, FormFieldLabel, FormSection } from '@/components/form-chrome';
import { fetchVitalCheckIns, recordVitalCheckIn } from '../api/vitals';
import { ipdQueryKeys } from '../api/query-keys';
import {
  admissionStatusBadgeClass,
  admissionStatusLabel,
  formatEnumLabel,
} from '../lib/display';
import {
  formToRecordInput,
  formatBloodPressure,
  formatVitalRecordedAt,
  formatVitalValue,
  hasAnyVitalMeasurement,
  type RecorderRole,
} from '../lib/vital-types';
import type { AdmissionDetail } from '../types';

type VitalsFormState = {
  heartRate: string;
  systolicBp: string;
  diastolicBp: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
  recordedBy: RecorderRole;
  notes: string;
};

const RECORDER_ROLES: RecorderRole[] = ['nurse', 'doctor', 'resident', 'consultant'];

const EMPTY_FORM = (): VitalsFormState => ({
  heartRate: '',
  systolicBp: '',
  diastolicBp: '',
  temperature: '',
  spo2: '',
  respiratoryRate: '',
  recordedBy: 'nurse',
  notes: '',
});

type VitalsChartPanelProps = {
  admission: AdmissionDetail;
  onBack: () => void;
};

export function VitalsChartPanel({ admission, onBack }: VitalsChartPanelProps) {
  const queryClient = useQueryClient();
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recorderFilter, setRecorderFilter] = useState<'all' | RecorderRole>('all');
  const [form, setForm] = useState<VitalsFormState>(EMPTY_FORM);

  const { data: vitals = [], isLoading } = useQuery({
    queryKey: ipdQueryKeys.vitalCheckIns(admission.id, recorderFilter),
    queryFn: () => fetchVitalCheckIns(admission.id, recorderFilter),
  });

  const patchForm = (patch: Partial<VitalsFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const toggleRecordForm = () => {
    setShowRecordForm((open) => !open);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = formToRecordInput(form);
      if (!hasAnyVitalMeasurement(input)) {
        throw new Error('Enter at least one vital sign');
      }
      return recordVitalCheckIn(admission.id, input);
    },
    onSuccess: () => {
      setForm(EMPTY_FORM());
      void queryClient.invalidateQueries({
        queryKey: [...ipdQueryKeys.admissions(), 'vital-check-ins', admission.id],
      });
      toast.success('Vitals recorded');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to record vitals');
    },
  });

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Vitals Chart</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            variant={showRecordForm ? 'secondary' : 'default'}
            onClick={toggleRecordForm}
          >
            <Plus className="size-4" />
            Record Vitals
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
        </div>
      </div>

      <div className="border-b bg-card px-4 py-4 md:px-6">
        <p className="text-base font-semibold">{admission.patientName}</p>
        <Badge
          variant="secondary"
          className={cn(
            'mt-1.5 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            admissionStatusBadgeClass(admission.status),
          )}
        >
          {admissionStatusLabel(admission.status)}
        </Badge>
      </div>

      <div className="flex-1 space-y-4 bg-muted/30 px-4 py-4 md:px-6">
        {showRecordForm ? (
          <FormSection title="Record Vitals">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField>
                <FormFieldLabel>Heart Rate (bpm)</FormFieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.heartRate}
                  onChange={(e) => patchForm({ heartRate: e.target.value })}
                />
              </FormField>
              <FormField>
                <FormFieldLabel>Systolic BP (mmHg)</FormFieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.systolicBp}
                  onChange={(e) => patchForm({ systolicBp: e.target.value })}
                />
              </FormField>
              <FormField>
                <FormFieldLabel>Diastolic BP (mmHg)</FormFieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.diastolicBp}
                  onChange={(e) => patchForm({ diastolicBp: e.target.value })}
                />
              </FormField>
              <FormField>
                <FormFieldLabel>Temperature (°C)</FormFieldLabel>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.temperature}
                  onChange={(e) => patchForm({ temperature: e.target.value })}
                />
              </FormField>
              <FormField>
                <FormFieldLabel>SpO2 (%)</FormFieldLabel>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.spo2}
                  onChange={(e) => patchForm({ spo2: e.target.value })}
                />
              </FormField>
              <FormField>
                <FormFieldLabel>Respiratory Rate</FormFieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.respiratoryRate}
                  onChange={(e) => patchForm({ respiratoryRate: e.target.value })}
                />
              </FormField>
              <FormField>
                <FormFieldLabel>Recorded By</FormFieldLabel>
                <Select
                  value={form.recordedBy}
                  onValueChange={(v) => patchForm({ recordedBy: v as RecorderRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORDER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {formatEnumLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField className="sm:col-span-2">
                <FormFieldLabel>Notes</FormFieldLabel>
                <Textarea
                  placeholder="Optional observations..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => patchForm({ notes: e.target.value })}
                />
              </FormField>
            </div>
            <div className="flex justify-end border-t pt-4">
              <Button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save Vitals
              </Button>
            </div>
          </FormSection>
        ) : null}

        <Select
          value={recorderFilter}
          onValueChange={(v) => setRecorderFilter(v as 'all' | RecorderRole)}
        >
          <SelectTrigger className="w-[200px] bg-card">
            <SelectValue placeholder="All Recorders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Recorders</SelectItem>
            {RECORDER_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {formatEnumLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Vitals</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>HR</TableHead>
                  <TableHead>BP</TableHead>
                  <TableHead>Temp</TableHead>
                  <TableHead>SpO2</TableHead>
                  <TableHead>RR</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Loading vitals…
                    </TableCell>
                  </TableRow>
                ) : vitals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No vitals recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  vitals.map((row) => (
                    <TableRow key={row.check_in_id}>
                      <TableCell className="tabular-nums">
                        {formatVitalRecordedAt(row.recorded_at)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatVitalValue(row.heart_rate)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatBloodPressure(row.systolic_bp, row.diastolic_bp)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatVitalValue(row.temperature)}
                      </TableCell>
                      <TableCell className="tabular-nums">{formatVitalValue(row.spo2)}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatVitalValue(row.respiratory_rate)}
                      </TableCell>
                      <TableCell>
                        {row.recorder_role ? formatEnumLabel(row.recorder_role) : '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {row.notes?.trim() ? row.notes : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
