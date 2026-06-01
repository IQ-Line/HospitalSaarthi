import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { Page } from '@/features/create-rx/components/page';

const searchSchema = z.object({
  mode: z.enum(['edit', 'view']).optional(),
  /** When false, skip by-visit load (new consultation — no prescription yet). */
  loadPrescription: z.boolean().optional(),
});

export const Route = createFileRoute('/_authenticated/create-rx/$visitId')({
  validateSearch: searchSchema,
  component: VisitRoute,
});

function VisitRoute() {
  const { visitId } = Route.useParams();
  const { mode, loadPrescription } = Route.useSearch();
  return <Page visitId={visitId} mode={mode} loadPrescription={loadPrescription} />;
}
