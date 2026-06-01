import { listBills } from '@/features/billing/api/bills';
import { BILLING_SOURCE_MODULE } from '@/features/billing/constants';

/** Resolve the registration desk bill for OPD invoice preview. */
export async function resolveRegistrationBillId(
  registrationId: string,
  visitId: string | null,
): Promise<string | null> {
  const bySource = await listBills({
    source_module: BILLING_SOURCE_MODULE.REGISTRATION,
    source_ref: registrationId,
    limit: 1,
  });
  const fromSource = bySource.data[0]?.id;
  if (fromSource) return fromSource;

  if (visitId) {
    const byVisit = await listBills({ visit_id: visitId, limit: 1 });
    return byVisit.data[0]?.id ?? null;
  }

  return null;
}
