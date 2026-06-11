import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  createClinicalNote,
  finalizeClinicalNote,
  updateClinicalNote,
} from '../api/clinical-notes';
import { ipdQueryKeys } from '../api/query-keys';
import {
  ADMISSION_SPECIALTIES,
  admissionStatusBadgeClass,
  admissionStatusLabel,
  formatEnumLabel,
} from '../lib/display';
import {
  clinicalNoteStatusLabel,
  type AuthorRole,
  type ClinicalNoteStatus,
  type ClinicalNoteUiType,
  uiNoteTypeToApi,
} from '../lib/clinical-note-types';
import type { AdmissionDetail } from '../types';

const NOTE_TYPES: {
  id: ClinicalNoteUiType;
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

const AUTHOR_ROLES: AuthorRole[] = [
  'consultant',
  'resident',
  'registrar',
  'nurse',
  'specialist',
  'intern',
];

type ClinicalNotePanelProps = {
  admission: AdmissionDetail;
  onBack: () => void;
};

function buildPayload(
  noteType: ClinicalNoteUiType,
  authorRole: AuthorRole,
  clinicalSpecialty: string,
  content: string,
  narrative: string,
) {
  return {
    note_type: uiNoteTypeToApi(noteType),
    author_role: authorRole,
    author_specialty_code: clinicalSpecialty || null,
    content: {
      structured: content.trim(),
      narrative: narrative.trim() || undefined,
    },
  };
}

export function ClinicalNotePanel({ admission, onBack }: ClinicalNotePanelProps) {
  const queryClient = useQueryClient();
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteStatus, setNoteStatus] = useState<ClinicalNoteStatus>('draft');
  const [noteType, setNoteType] = useState<ClinicalNoteUiType | null>(null);
  const [authorRole, setAuthorRole] = useState<AuthorRole | ''>('');
  const [clinicalSpecialty, setClinicalSpecialty] = useState('');
  const [content, setContent] = useState('');
  const [narrative, setNarrative] = useState('');

  const isReadOnly = noteStatus !== 'draft';

  const canSave =
    noteType != null &&
    authorRole.length > 0 &&
    clinicalSpecialty.length > 0 &&
    content.trim().length > 0;

  const invalidateNotes = () => {
    void queryClient.invalidateQueries({
      queryKey: ipdQueryKeys.clinicalNotes(admission.id),
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!noteType || !authorRole) throw new Error('Missing required fields');
      const payload = buildPayload(
        noteType,
        authorRole,
        clinicalSpecialty,
        content,
        narrative,
      );
      if (noteId) {
        return updateClinicalNote(admission.id, noteId, payload);
      }
      return createClinicalNote(admission.id, payload);
    },
    onSuccess: (note) => {
      setNoteId(note.id);
      setNoteStatus(note.status);
      invalidateNotes();
      toast.success('Clinical note saved as draft');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save note');
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!noteId) {
        if (!noteType || !authorRole) throw new Error('Missing required fields');
        const created = await createClinicalNote(
          admission.id,
          buildPayload(noteType, authorRole, clinicalSpecialty, content, narrative),
        );
        setNoteId(created.id);
        return finalizeClinicalNote(admission.id, created.id);
      }
      return finalizeClinicalNote(admission.id, noteId);
    },
    onSuccess: (note) => {
      setNoteId(note.id);
      setNoteStatus(note.status);
      invalidateNotes();
      toast.success('Clinical note finalized');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to finalize note');
    },
  });

  const isPending = saveMutation.isPending || finalizeMutation.isPending;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Clinical Note</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {clinicalNoteStatusLabel(noteStatus)}
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
                  disabled={isReadOnly}
                  onClick={() => setNoteType(id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                    selected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background hover:bg-muted/50',
                    isReadOnly && 'pointer-events-none opacity-60',
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
              <Select
                value={authorRole || undefined}
                onValueChange={(v) => setAuthorRole(v as AuthorRole)}
                disabled={isReadOnly}
              >
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
              <Select
                value={clinicalSpecialty || undefined}
                onValueChange={setClinicalSpecialty}
                disabled={isReadOnly}
              >
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
                className="min-h-[100px] resize-y"
              />
            </FormField>

            {!isReadOnly ? (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  disabled={!canSave || isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  <Save className="size-4" />
                  Save Draft
                </Button>
                <Button
                  type="button"
                  className="gap-1.5"
                  disabled={!canSave || isPending}
                  onClick={() => finalizeMutation.mutate()}
                >
                  <CheckCircle2 className="size-4" />
                  Finalize
                </Button>
              </div>
            ) : null}
          </div>
        </FormSection>
      </div>
    </div>
  );
}
