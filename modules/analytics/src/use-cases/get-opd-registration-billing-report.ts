import type { OpdRegistrationBillingReportRepo } from "../ports.js";
import type {
  OpdRegistrationBillingReportPage,
  OpdRegistrationBillingReportQuery,
  RegistrationSourceFilter,
} from "../domain/opd-registration-billing-report.types.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parseRegistrationSource(raw: string | undefined): RegistrationSourceFilter {
  if (raw === "abha" || raw === "manual") {
    return raw;
  }
  return "all";
}

export function parseOpdRegistrationBillingReportQuery(input: {
  from_date?: string;
  to_date?: string;
  registration_source?: string;
  page?: string;
  limit?: string;
}): OpdRegistrationBillingReportQuery {
  const from_date = input.from_date?.trim();
  const to_date = input.to_date?.trim();
  if (!from_date || !to_date) {
    throw new Error("from_date and to_date are required");
  }
  const page = Math.max(1, input.page ? Number.parseInt(input.page, 10) : 1);
  const parsedLimit = input.limit ? Number.parseInt(input.limit, 10) : DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT));
  return {
    from_date,
    to_date,
    registration_source: parseRegistrationSource(input.registration_source),
    page: Number.isFinite(page) ? page : 1,
    limit,
  };
}

export async function getOpdRegistrationBillingReport(
  deps: { reportRepo: OpdRegistrationBillingReportRepo },
  tenantId: string,
  query: OpdRegistrationBillingReportQuery,
): Promise<OpdRegistrationBillingReportPage> {
  return deps.reportRepo.getReportPage(tenantId, query);
}
