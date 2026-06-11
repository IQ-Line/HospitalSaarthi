import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { fetchClinicalNotes } from '../api/clinical-notes';
import { ipdQueryKeys } from '../api/query-keys';
import { formatEnumLabel } from '../lib/display';
import {
  apiNoteTypeToUi,
  clinicalNoteStatusLabel,
  type ClinicalNote,
} from '../lib/clinical-note-types';

type SummaryNotesPanelProps = {
  admissionId: string;
  onAddNote: () => void;
};

function formatNoteType(note: ClinicalNote): string {
  const uiType = apiNoteTypeToUi(note.note_type);
  if (uiType) return formatEnumLabel(uiType);
  return formatEnumLabel(note.note_type.replace(/_note$/, ''));
}

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function notePreview(note: ClinicalNote): string {
  const text = note.content.structured?.trim() || note.content.narrative?.trim();
  return text ? (text.length > 80 ? `${text.slice(0, 80)}…` : text) : '—';
}

export function SummaryNotesPanel({ admissionId, onAddNote }: SummaryNotesPanelProps) {
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ipdQueryKeys.clinicalNotes(admissionId),
    queryFn: () => fetchClinicalNotes(admissionId),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" className="gap-1.5" onClick={onAddNote}>
          <Plus className="size-4" />
          Add Note
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
          Loading notes…
        </div>
      ) : notes.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
          No clinical notes yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author Role</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">{formatNoteType(note)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {clinicalNoteStatusLabel(note.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatEnumLabel(note.author_role)}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {notePreview(note)}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">{formatNoteDate(note.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
