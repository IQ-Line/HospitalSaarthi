import { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  LogOut,
  Save,
  Scissors,
  Stethoscope,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Textarea } from '@pulse/ui/textarea';
import { cn } from '@pulse/utils';
import { FormField, FormFieldLabel, FormSection } from '@/components/form-chrome';
import {
  ADMISSION_SPECIALTIES,
  admissionStatusBadgeClass,
  admissionStatusLabel,
  formatEnumLabel,
} from '../lib/display';
import type { AdmissionDetail } from '../types';

export type ClinicalNoteType =
  | 'admission'
  | 'progress'
  | 'procedure'
  | 'consultation'
  | 'discharge_summary'
  | 'operation'
  | 'transfer'
  | 'handover';

const NOTE_TYPES: {
  id: ClinicalNoteType;
  label: string;
  icon: typeof FileText;
}[] = [
  { id: 'admission', label: 'Admission Note', icon: FileText },
  { id: 'progress', label: 'Progress Note', icon: Activity },
  { id: 'procedure', label: 'Procedure Note', icon: Scissors },
  { id: 'consultation', label: 'Consultation Note', icon: Stethoscope },
  { id: 'discharge_summary', label: 'Discharge Summary', icon: LogOut },
  { id: 'operation', label: 'Operation Note', icon: ClipboardList },
  { id: 'transfer', label: 'Transfer Note', icon: ArrowLeftRight },
  { id: 'handover', label: 'Handover Note', icon: Users },
];

const AUTHOR_ROLES = [
  'consultant',
  'resident',
  'registrar',
  'nurse',
  'specialist',
  'intern',
] as const;

type ClinicalNotePanelProps = {
  admission: AdmissionDetail;
  onBack: () => void;
};

export function ClinicalNotePanel({ admission, onBack }: ClinicalNotePanelProps) {
  const [noteType, setNoteType] = useState<ClinicalNoteType | null>(null);
  const [authorRole, setAuthorRole] = useState('');
  const [clinicalSpecialty, setClinicalSpecialty] = useState('');
  const [content, setContent] = useState('');
  const [narrative, setNarrative] = useState('');

  const canFinalize =
    noteType != null &&
    authorRole.length > 0 &&
    clinicalSpecialty.length > 0 &&
    content.trim().length > 0;

  const handleSaveDraft = () => {
    toast.success('Clinical note saved as draft');
  };

  const handleFinalize = () => {
    if (!canFinalize) return;
    toast.success('Clinical note finalized');
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Clinical Note</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Draft
          </Badge>
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
        <FormSection title="Note Type">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {NOTE_TYPES.map(({ id, label, icon: Icon }) => {
              const selected = noteType === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setNoteType(id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                    selected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background hover:bg-muted/50',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </FormSection>

        <FormSection title="Author Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormFieldLabel>Author Role</FormFieldLabel>
              <Select value={authorRole || undefined} onValueChange={setAuthorRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {AUTHOR_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatEnumLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField>
              <FormFieldLabel>Clinical Specialty</FormFieldLabel>
              <Select value={clinicalSpecialty || undefined} onValueChange={setClinicalSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {ADMISSION_SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {formatEnumLabel(specialty)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Note Content">
          <div className="space-y-4">
            <FormField>
              <FormFieldLabel>Content</FormFieldLabel>
              <Textarea
                placeholder="Enter structured note content..."
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[140px] resize-y"
              />
            </FormField>

            <FormField>
              <FormFieldLabel>Narrative / Additional Comments</FormFieldLabel>
              <Textarea
                placeholder="Free-text narrative..."
                rows={4}
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                className="min-h-[100px] resize-y"
              />
            </FormField>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" className="gap-1.5" onClick={handleSaveDraft}>
                <Save className="size-4" />
                Save Draft
              </Button>
              <Button
                type="button"
                className="gap-1.5"
                disabled={!canFinalize}
                onClick={handleFinalize}
              >
                <CheckCircle2 className="size-4" />
                Finalize
              </Button>
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
}
