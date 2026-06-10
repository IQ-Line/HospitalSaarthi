import { useState } from 'react';
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
import {
  admissionStatusBadgeClass,
  admissionStatusLabel,
  formatEnumLabel,
} from '../lib/display';
import type { AdmissionDetail } from '../types';

type VitalsRow = {
  id: string;
  time: string;
  hr: string;
  bp: string;
  temp: string;
  spo2: string;
  rr: string;
  recordedBy: string;
  role: string;
  notes: string;
};

type VitalsFormState = {
  heartRate: string;
  systolicBp: string;
  diastolicBp: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
  recordedBy: string;
  notes: string;
};

const RECORDER_ROLES = ['nurse', 'doctor', 'resident', 'consultant'] as const;

const TREND_LEGEND = [
  { key: 'HR', color: 'bg-emerald-500' },
  { key: 'SBP', color: 'bg-blue-500' },
  { key: 'SpO2', color: 'bg-orange-500' },
  { key: 'Temp', color: 'bg-pink-500' },
  { key: 'RR', color: 'bg-cyan-500' },
] as const;

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
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recorderFilter, setRecorderFilter] = useState('all');
  const [form, setForm] = useState<VitalsFormState>(EMPTY_FORM);
  const [vitals, setVitals] = useState<VitalsRow[]>([]);

  const filteredVitals =
    recorderFilter === 'all'
      ? vitals
      : vitals.filter((row) => row.role === recorderFilter);

  const patchForm = (patch: Partial<VitalsFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const toggleRecordForm = () => {
    setShowRecordForm((open) => !open);
  };

  const handleSaveVitals = () => {
    const hasValues = [
      form.heartRate,
      form.systolicBp,
      form.diastolicBp,
      form.temperature,
      form.spo2,
      form.respiratoryRate,
    ].some((v) => v.trim().length > 0);

    if (!hasValues) {
      toast.error('Enter at least one vital sign');
      return;
    }

    const bp =
      form.systolicBp || form.diastolicBp
        ? `${form.systolicBp || '—'}/${form.diastolicBp || '—'}`
        : '—';

    setVitals((prev) => [
      {
        id: crypto.randomUUID(),
        time: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        hr: form.heartRate || '—',
        bp,
        temp: form.temperature || '—',
        spo2: form.spo2 || '—',
        rr: form.respiratoryRate || '—',
        recordedBy: formatEnumLabel(form.recordedBy),
        role: form.recordedBy,
        notes: form.notes || '—',
      },
      ...prev,
    ]);

    setForm(EMPTY_FORM());
    setShowRecordForm(false);
    toast.success('Vitals recorded');
  };

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
                  onValueChange={(v) => patchForm({ recordedBy: v })}
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
              <Button type="button" onClick={handleSaveVitals}>
                Save Vitals
              </Button>
            </div>
          </FormSection>
        ) : null}

        <Select value={recorderFilter} onValueChange={setRecorderFilter}>
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
            <CardTitle className="text-base">Vitals Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 p-6">
              <p className="text-sm text-muted-foreground">Trend chart will render here</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                {TREND_LEGEND.map(({ key, color }) => (
                  <span key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn('size-2.5 rounded-full', color)} />
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVitals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No vitals recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVitals.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="tabular-nums">{row.time}</TableCell>
                      <TableCell className="tabular-nums">{row.hr}</TableCell>
                      <TableCell className="tabular-nums">{row.bp}</TableCell>
                      <TableCell className="tabular-nums">{row.temp}</TableCell>
                      <TableCell className="tabular-nums">{row.spo2}</TableCell>
                      <TableCell className="tabular-nums">{row.rr}</TableCell>
                      <TableCell>{row.recordedBy}</TableCell>
                      <TableCell>{formatEnumLabel(row.role)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.notes}</TableCell>
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
