import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import type { ConsultationAccess, FullContextResponse } from '../types';

function patientLabel(ctx: FullContextResponse): string {
  const p = ctx.patient;
  const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
  return parts.join(' ') || p.uhid;
}

type Props = {
  visitId: string;
  context: FullContextResponse | undefined;
  access: ConsultationAccess | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
};

export function SmartParchaConsultationPage({
  visitId,
  context,
  access,
  isLoading,
  isError,
  errorMessage,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-hidden />
        <p>Loading consultation…</p>
      </div>
    );
  }

  if (isError || !context) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smart Parcha</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            {errorMessage ?? 'Unable to load visit context. Check that smart-parcha-svc and HIMS adapter are running.'}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/frontdesk/visit-registration">Back to frontdesk</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const readOnly = access?.isReadOnly ?? false;
  const pages = context.smartParcha?.parchaContent ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      {readOnly ? (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="status"
        >
          Consultation ended — view only (prior-day or locked visit).
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{patientLabel(context)}</h1>
          <p className="text-muted-foreground text-sm">
            UHID {context.patient.uhid} · Visit {context.visit.visitNumber ?? visitId}
          </p>
        </div>
        <div className="flex gap-2">
          {readOnly ? <Badge variant="destructive">Read only</Badge> : null}
          {access?.addendum ? <Badge variant="secondary">Addendum</Badge> : null}
          <Badge variant="outline">{context.visit.status}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Canvas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Konva canvas from legacy Create RX is not bundled in HospitalSaarthi yet. Wire{' '}
              <code className="text-xs">@/features/smart-parcha/components/canvas</code> when porting{' '}
              <code className="text-xs">hims-frontend</code> Canvas.
            </p>
            {pages.length > 0 ? (
              <ul className="mt-3 list-disc pl-5 text-sm">
                {pages.map((p) => (
                  <li key={p.pageNumber}>
                    Page {p.pageNumber}: {p.content.slice(0, 80)}
                    {p.content.length > 80 ? '…' : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm">No saved parcha pages yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Department:</span>{' '}
              {context.visit.department?.name ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Chief complaints:</span>{' '}
              {Array.isArray(context.visit.chiefComplaints)
                ? context.visit.chiefComplaints.length
                : 0}
            </p>
            <p>
              <span className="text-muted-foreground">Prescription draft:</span>{' '}
              {context.prescription ? 'Yes' : 'No'}
            </p>
            <p>
              <span className="text-muted-foreground">AI mapped fields:</span>{' '}
              {context.aiPrescription?.mappedFields
                ? Object.keys(context.aiPrescription.mappedFields).length
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
