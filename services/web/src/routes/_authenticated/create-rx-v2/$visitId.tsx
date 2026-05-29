import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CreateRxPage } from '@/features/create-rx/components/create-rx-page';

const searchSchema = z.object({
  mode: z.enum(['edit', 'view']).optional(),
});

export const Route = createFileRoute('/_authenticated/create-rx-v2/$visitId')({
  validateSearch: searchSchema,
  component: CreateRxV2VisitRoute,
});

function CreateRxV2VisitRoute() {
  const { visitId } = Route.useParams();
  const { mode } = Route.useSearch();
  return <CreateRxPage visitId={visitId} mode={mode} />;
}
