import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CreateRxPage } from '@/features/create-rx/components/page';

const searchSchema = z.object({
  mode: z.enum(['edit', 'view']).optional(),
});

export const Route = createFileRoute('/_authenticated/create-rx/$visitId')({
  validateSearch: searchSchema,
  component: CreateRxVisitRoute,
});

function CreateRxVisitRoute() {
  const { visitId } = Route.useParams();
  const { mode } = Route.useSearch();
  return <CreateRxPage visitId={visitId} mode={mode} />;
}
