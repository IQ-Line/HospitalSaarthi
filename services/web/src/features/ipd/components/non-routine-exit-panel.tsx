import { useState } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { FormField, FormFieldLabel, FormSection } from '@/components/form-chrome';
import type { AdmissionDetail } from '../types';

const EXIT_TYPES = [
  { value: 'lama', label: 'LAMA (Left Against Medical Advice)' },
  { value: 'dama', label: 'DAMA (Discharge Against Medical Advice)' },
  { value: 'abscond', label: 'Abscond' },
  { value: 'death', label: 'Death' },
  { value: 'other', label: 'Other' },
] as const;

type NonRoutineExitPanelProps = {
  admission: AdmissionDetail;
  onBack: () => void;
};

export function NonRoutineExitPanel({ admission, onBack }: NonRoutineExitPanelProps) {
  const [exitType, setExitType] = useState('');

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Non-Routine Exit: {admission.patientName}
        </h1>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="size-3.5" />
          Back
        </Button>
      </div>

      <div className="flex-1 bg-muted/30 px-4 py-4 md:px-6">
        <FormSection
          title={
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" aria-hidden />
              Exit Type
            </span>
          }
        >
          <FormField>
            <FormFieldLabel>Select Exit Type</FormFieldLabel>
            <Select value={exitType || undefined} onValueChange={setExitType}>
              <SelectTrigger className="w-full max-w-none">
                <SelectValue placeholder="Choose exit type..." />
              </SelectTrigger>
              <SelectContent>
                {EXIT_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>
      </div>
    </div>
  );
}
