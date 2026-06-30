import { createFileRoute } from '@tanstack/react-router';
import { AbhaConsentListPage } from '@/features/abha-consent-list/abha-consent-list-page';

export const Route = createFileRoute('/_authenticated/abha-consent-list/')({
  component: AbhaConsentListPage,
});
