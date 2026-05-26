// Placeholder: event consumers deferred until cross-service event infrastructure exists.
// Events to consume:
// - consultation.finalized (OPD) — triggers care_context registration + bundle storage
// - lab-report.finalized (Lab)
// - discharge-summary.signed (IPD)
// - abdm.consent.granted (Integration Hub) — toggle consent_disclosable
// - abdm.consent.revoked (Integration Hub) — toggle consent_disclosable
// - abdm.health-record.received (Integration Hub) — ingest external bundle
