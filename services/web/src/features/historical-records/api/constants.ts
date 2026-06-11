/** Historical records rarely change intra-session — avoid refetch on tab focus. */
export const HISTORICAL_RECORDS_STALE_MS = 60_000;

/** Cap visits loaded per patient when search aggregates client-side (Phase 0). */
export const SEARCH_VISITS_PER_PATIENT_LIMIT = 50;
