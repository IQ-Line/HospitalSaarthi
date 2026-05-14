# Integration Platform -- Scenarios

End-to-end walkthroughs of the most consequential ABDM flows, illustrating how the Integration Hub, Record Foundation, EMPI, and Configurator collaborate. Each scenario references the FSM definition (from [`02-fsm-specifications.md`](./02-fsm-specifications.md)) and the schema tables (from [`01-schema-design.md`](./01-schema-design.md)).

---

## Scenario 1 -- Patient walks in, kiosk QR scan, registration desk redeems

The patient arrives at the facility, opens their PHR app, scans the kiosk QR. The platform must (a) receive the on-share callback from the gateway, (b) resolve the patient via EMPI, (c) issue a daily token, (d) surface the token at the registration desk.

```mermaid
sequenceDiagram
  autonumber
  actor Patient
  participant PHR as Patient PHR app
  participant ABDM as ABDM Gateway
  participant IGW as Integration Hub<br/>(Inbound)
  participant FSM as FSM Engine
  participant EMPI as EMPI service
  participant DB as integration_hub<br/>(abdm_share_tokens / issuances)
  participant Bus as Event Bus
  participant Web as Web BFF + Reg Desk UI

  Patient->>PHR: scan facility QR
  PHR->>ABDM: profile-share request<br/>(facility id, ABHA address)
  ABDM->>IGW: POST /v3/profile/on-share<br/>(payload: ABHA address + profile)
  IGW->>IGW: authenticate (gateway mTLS),<br/>idempotency check via integration_inbound_messages
  IGW->>FSM: start workflow abdm.scan-and-share.v1
  FSM->>EMPI: POST /api/v1/patients/find-or-create<br/>(abha_address, demographics)
  EMPI-->>FSM: {patient_id}
  FSM->>DB: UPSERT abdm_share_tokens<br/>(facility, today, next_token_number+1)<br/>RETURNING token_number
  FSM->>DB: INSERT abdm_share_token_issuances<br/>(token_number, patient_id, abha_address, profile_ref)
  FSM->>Bus: publish abdm.scan-and-share.token-issued
  FSM-->>IGW: TOKEN_ISSUED (token_number)
  IGW-->>ABDM: 200 { tokenNumber: N }
  Bus-->>Web: token-issued event
  Web->>Web: surface "Patient with token N has arrived"
  Patient->>Web: walks up to desk, mentions token N
  Web->>DB: GET abdm_share_token_issuances WHERE token_number = N AND issue_date = today
  DB-->>Web: {patient_id, profile}
  Web->>EMPI: GET /api/v1/patients/{patient_id}
  EMPI-->>Web: full patient record
  Web-->>Patient: registration completed; redirect to OPD queue
```

Notes:

- The **EMPI find-or-create** step deserves attention. EMPI's existing `register-patient` use-case ([PR #12](https://github.com/IQ-Line/HospitalSaarthi/pull/12)) handles the "create if not found, update if found" semantics. ABHA address is one identifier; the call also passes demographics from the gateway-shared profile so EMPI's dedup logic runs.
- **Idempotency.** If the gateway retries the on-share callback (network blip), `integration_inbound_messages` rejects the duplicate by `external_message_id` (the gateway-supplied requestId) and returns the original token number. The token counter is **not** incremented twice.
- **Token redemption.** The reg-desk UI looks up the token by `(token_number, issue_date)` -- the unique compound key. Once redeemed, `abdm_share_token_issuances.redeemed_at` is set; this both blocks re-redemption and feeds analytics ("token issued at 09:14, redeemed at 09:21 -- 7 minute walk-from-kiosk-to-desk").

---

## Scenario 2 -- New patient, no ABHA, kiosk-driven Aadhaar OTP enrollment

The patient does not have an ABHA. At the kiosk (or at the registration desk), the staff initiates ABHA creation via Aadhaar OTP. This is the M1 flow from [§3 of `02-fsm-specifications.md`](./02-fsm-specifications.md#3-abdmm1aadhaar-otpv1--abha-creation-via-aadhaar-otp).

```mermaid
sequenceDiagram
  autonumber
  actor Staff
  participant Web as Web BFF + Reg Desk UI
  participant Hub as Integration Hub
  participant FSM as FSM Engine
  participant ABDM as ABDM Gateway
  participant EMPI as EMPI service
  participant Bus as Event Bus

  Staff->>Web: enter Aadhaar (or biometric) for patient
  Web->>Hub: POST /api/v1/abdm/abha/enroll<br/>(aadhaar, patient_id, consent)
  Hub->>FSM: start abdm.m1.aadhaar-otp.v1<br/>workflow_id W1
  FSM->>FSM: state INIT -> OTP_REQUESTED
  FSM->>ABDM: POST /v3/enrollment/otp/request<br/>(Fidelius-encrypted Aadhaar)
  ABDM-->>FSM: {txnId}
  FSM->>FSM: persist context.txnId<br/>start 600s timeout timer
  FSM-->>Hub: workflow W1, state OTP_REQUESTED
  Hub-->>Web: {workflow_id: W1, status: OTP_SENT}
  Web-->>Staff: prompt for OTP

  Staff->>Web: enter OTP from patient phone
  Web->>Hub: POST /api/v1/abdm/abha/W1/verify-otp (otp)
  Hub->>FSM: dispatch verify-otp event
  FSM->>FSM: state OTP_REQUESTED -> OTP_VERIFIED
  FSM->>ABDM: POST /v3/enrollment/otp/verify<br/>(txnId, encrypted OTP)
  ABDM-->>FSM: {tToken}
  FSM->>FSM: cancel timeout timer<br/>persist context.tToken

  FSM->>FSM: auto-advance: dispatch create-abha<br/>(state OTP_VERIFIED -> ABHA_CREATED)
  FSM->>ABDM: POST /v3/enrollment/enrol/byAadhaar<br/>(txnId, tToken, consent)
  ABDM-->>FSM: {ABHANumber, ABHAProfile}
  FSM->>FSM: persist context.abhaNumber

  Note over FSM,Web: UI prompts for preferred ABHA address
  Staff->>Web: enter desired abhaAddress (e.g., "ayush@sbx")
  Web->>Hub: POST /api/v1/abdm/abha/W1/create-address (preferredAbhaAddress)
  Hub->>FSM: dispatch create-abha-address
  FSM->>ABDM: POST /v3/profile/account/abha-address<br/>(txnId, preferredAbhaAddress)
  ABDM-->>FSM: {abhaAddress}

  FSM->>FSM: auto-advance: link-to-patient<br/>(ADDRESS_CREATED -> LINKED)
  FSM->>EMPI: POST /api/v1/patients/{patient_id}/identifiers<br/>(abha_number)
  FSM->>EMPI: POST /api/v1/patients/{patient_id}/identifiers<br/>(abha_address)
  EMPI->>Bus: emit patient.identifier-linked (x2)
  FSM->>Bus: emit abdm.m1.completed
  FSM-->>Hub: workflow W1 LINKED
  Hub-->>Web: {workflow: COMPLETE, abha_number, abha_address}
  Web-->>Staff: "ABHA created: 91-9000-XXXX-YYYY (ayush@sbx)"
```

Notes:

- **`auto-advance`** transitions are the FSM engine convenience for cases where one transition's success deterministically triggers the next. They are still recorded as separate transitions in `integration_workflow_transitions` -- the engine emits them, but each is its own row for audit clarity.
- **Failure recovery.** If the patient enters wrong OTP, `verify-otp` fails (gateway 4xx). The engine's outbound retry policy treats 4xx as terminal-fail. The workflow transitions to `FAILED`, the UI shows the gateway error, and the staff can start a new workflow. The original failed workflow is preserved for audit.
- **Two identifier rows in EMPI.** ABHA *number* and ABHA *address* are distinct identifiers (recall the EMPI schema in [PR #12](https://github.com/IQ-Line/HospitalSaarthi/pull/12)'s `patient_identifiers` polymorphic table). EMPI's `patients.abha_number` denormalised column is also updated by the EMPI use-case (the link call's handler sets it for fast lookup).
- **`patient_id` exists before the workflow starts.** The patient was created in EMPI when the staff opened the kiosk session (anonymous "walk-in" patient). The M1 workflow links ABHA to that pre-existing patient row. This avoids the chicken-and-egg of "no patient yet -> no patient_id -> can't reference in workflow."

---

## Scenario 3 -- HIP-initiated linking of past records (existing patient, newly-acquired ABHA)

The hospital has historical records for a patient who has just acquired an ABHA. Staff initiates linking to publish those care contexts under the ABHA.

```mermaid
sequenceDiagram
  autonumber
  actor Staff
  participant Web as Web BFF
  participant Hub as Integration Hub
  participant FSM as FSM Engine
  participant RF as Record Foundation
  participant ABDM as ABDM Gateway

  Staff->>Web: open patient -> "Link past records to ABHA"
  Web->>RF: GET /api/v1/care-contexts?patient_id=P&abha_linkage_status=linkable
  RF-->>Web: [list of care_contexts]
  Staff->>Web: confirm selection
  Web->>Hub: POST /api/v1/abdm/m2/hip-link<br/>(patient_id, abha_address, care_context_ids)
  Hub->>FSM: start abdm.m2.hip-initiated-link.v1
  FSM->>ABDM: POST /v3/care-context/link-init<br/>(patient ref, careContexts list)
  ABDM-->>FSM: {linkRefNumber, authMode}
  Note over FSM,ABDM: ABDM dispatches OTP to patient phone
  ABDM->>Hub: inbound POST /v3/care-context/link-on-confirm<br/>(after patient enters OTP in PHR app)
  Hub->>FSM: dispatch link-confirmed event
  FSM->>ABDM: POST /v3/care-context/link-on-confirm<br/>(facility-side ack)
  FSM->>RF: POST /api/v1/care-contexts/bulk-update-linkage<br/>(care_context_ids, abdm_reference_number, abha_linkage_status='linked')
  RF-->>FSM: ok
  FSM-->>Hub: workflow LINKED
  Hub-->>Web: {linked_count: N}
```

Notes:

- **Discovery is Record Foundation's API** -- not a query directly against operational modules. Record Foundation's `timeline_index` projection (or a direct `care_contexts` query) is the source.
- **The OTP is between ABDM and the patient's phone**, not between the platform and the patient. The platform never sees the OTP; it just waits for the gateway's `link-on-confirm` callback.
- **The link operation is bulk** -- one call attaches ABDM reference numbers to many care contexts at once. Per-context linking would multiply round-trips for no benefit.

---

## Scenario 4 -- M3 HIP: external HIU requests records under granted consent

A doctor at another hospital (the HIU) requests this patient's records. The patient grants consent in their PHR app. The platform receives the consent notification, then later receives the data request, fetches bundles from Record Foundation, and pushes them encrypted to the HIU.

```mermaid
sequenceDiagram
  autonumber
  participant ExtHIU as External HIU<br/>(another hospital)
  participant ABDM as ABDM Gateway
  participant Hub as Integration Hub
  participant FSM as FSM Engine
  participant ConsentSup as FSM Engine<br/>(consent supervisor)
  participant RF as Record Foundation
  participant Vault as Secret Vault<br/>(Fidelius keys)
  participant Bus as Event Bus

  ExtHIU->>ABDM: consent request (patient X, hi types, date range)
  ABDM->>ABDM: patient grants in PHR app
  ABDM->>Hub: inbound POST /v3/consents/hip/notify<br/>(consentId, status=GRANTED, careContexts, dataEraseAt)
  Hub->>FSM: start abdm.m3.hip.v1<br/>workflow Wh
  FSM->>FSM: state CONSENT_NOTIFIED -> CONSENT_PERSISTED
  FSM->>FSM: INSERT abdm_consent_artifacts<br/>(consentId, role=hip, status=granted, ...)
  FSM->>Bus: emit abdm.consent.granted
  FSM->>ConsentSup: start abdm.consent.lifecycle.v1<br/>workflow Ws (timer at dataEraseAt)
  Bus-->>RF: abdm.consent.granted
  RF->>RF: timeline_index.consent_disclosable=true<br/>for matching care_contexts
  FSM-->>Hub: workflow Wh AWAITING_DATA_REQUEST
  Hub-->>ABDM: 200 (notify ack)

  Note over ExtHIU,Hub: Hours-to-days pass. Wh sits idle. Ws timer counts down.

  ExtHIU->>ABDM: health information request (consentId, dataPushUrl, transferPublicKey)
  ABDM->>Hub: inbound POST /v3/health-information/hip/request<br/>(consentId, requestId, dataPushUrl, transferPubKey)
  Hub->>FSM: dispatch data-requested event on Wh
  FSM->>FSM: state CONSENT_PERSISTED -> DATA_REQUESTED -> KEYS_EXCHANGED
  FSM->>Vault: derive Fidelius nonce, ephemeral keypair for this transfer
  FSM->>RF: POST /api/v1/disclosures<br/>(consent_artifact_id, hi_types, date_range)
  RF->>RF: query care_contexts + bundle_manifests<br/>filtered by consent.permissions
  RF-->>FSM: [bundle_storage_ids]
  FSM->>RF: GET /api/v1/bundles/{id} (per id)
  RF-->>FSM: bundle JSON bytes
  FSM->>FSM: encrypt each bundle with transferPubKey<br/>(Fidelius envelope)
  FSM->>FSM: state KEYS_EXCHANGED -> BUNDLES_PUSHED
  FSM->>ExtHIU: POST {dataPushUrl}<br/>(encrypted bundles, transactionId)
  ExtHIU-->>FSM: 200
  FSM->>ABDM: POST /v3/health-information/notify<br/>(transactionId, status=TRANSFERRED)
  FSM->>FSM: BUNDLES_PUSHED -> ACKNOWLEDGED
  FSM->>Bus: emit integration.workflow.completed
```

Notes:

- **Two workflows** are started by the consent grant: the M3-HIP **operational** workflow (which finishes at `ACKNOWLEDGED`) and the consent **lifecycle supervisor** (which lives until `dataEraseAt`). This is the "Process Manager at two granularities" pattern from [§8 of FSM specs](./02-fsm-specifications.md#8-abdmconsentlifecyclev1--the-long-lived-supervisor).
- **Fidelius encryption** is the ABDM-mandated envelope encryption. The platform never sees the HIU's *plaintext* records on the wire; the bundles are encrypted with the HIU's `transferPublicKey` before leaving the Hub. The secrets SDK resolves the Fidelius signing/encryption material; the ephemeral keypair is derived per-transfer.
- **Record Foundation does not perform encryption.** It returns plaintext bundles to Integration Hub; encryption happens in the Hub. This preserves the boundary -- Record Foundation's job is the byte-exact retrieval, not protocol-specific transformations.
- **Audit substrate.** Every step writes to `integration_workflow_transitions` (state changes) and `integration_outbound_messages` (the encrypted bundle leaving the platform), with `consent_id` set on both. The future centralized audit consumer answers the regulatory question "show me everything that happened under consent X" by joining those two streams. Per [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md), there is no per-module audit table here.

---

## Scenario 5 -- M3 HIU: doctor pulls external records for a patient

A doctor opens a patient and requests records from external HIPs. The platform initiates consent, the patient approves in their PHR app, the records flow back, Record Foundation ingests them.

```mermaid
sequenceDiagram
  autonumber
  actor Doctor
  participant Web as Web (Doctor UI)
  participant Hub as Integration Hub
  participant FSM as FSM Engine
  participant ABDM as ABDM Gateway
  participant ExtHIP as External HIP
  participant Bus as Event Bus
  participant RF as Record Foundation

  Doctor->>Web: open patient -> "Fetch external records"<br/>(select hi types, date range, purpose)
  Web->>Hub: POST /api/v1/abdm/m3/hiu-request<br/>(patient_id, abha_address, hi_types, dateRange, purposeCode)
  Hub->>FSM: start abdm.m3.hiu.v1
  FSM->>ABDM: POST /v3/consents/hiu/request<br/>(consent request)
  ABDM-->>FSM: {consentRequestId}
  FSM->>FSM: state CONSENT_INIT_REQUESTED -> AWAITING_PATIENT_APPROVAL<br/>start 7-day timeout timer
  FSM-->>Hub: {workflow: AWAITING}
  Hub-->>Web: "consent request sent, awaiting patient approval"

  Note over Doctor,ABDM: Patient receives notification in PHR app, approves.

  ABDM->>Hub: inbound POST /v3/consents/hiu/notify<br/>(status=GRANTED, consentArtifact)
  Hub->>FSM: dispatch consent-granted on workflow
  FSM->>FSM: persist abdm_consent_artifacts (role=hiu)
  FSM->>Bus: emit abdm.consent.granted
  FSM->>FSM: AWAITING_PATIENT_APPROVAL -> CONSENT_GRANTED -> DATA_REQUESTED
  FSM->>ABDM: POST /v3/health-information/hiu/request<br/>(consentId, dataPushUrl=hipBase/v3/.../data-push)
  ABDM-->>FSM: {transactionId}
  FSM->>FSM: state DATA_REQUESTED -> AWAITING_PUSH

  ExtHIP->>Hub: inbound POST hipBase/v3/health-information/data-push<br/>(encrypted bundles)
  Hub->>FSM: dispatch data-arrived
  FSM->>FSM: AWAITING_PUSH -> BUNDLES_RECEIVED -> BUNDLES_DECRYPTED<br/>(Fidelius decrypt)
  FSM->>Bus: emit abdm.health-record.received (per bundle)
  Bus-->>RF: abdm.health-record.received
  RF->>RF: INSERT bundle_storage / record_bundle_manifests /<br/>care_contexts (source_origin='external_abdm') /<br/>external_health_records / timeline_index
  RF->>Bus: emit record-foundation.external-record.received
  FSM->>ABDM: POST /v3/health-information/notify<br/>(status=TRANSFERRED)
  FSM->>FSM: RECORDS_INGESTED -> ACKNOWLEDGED

  Doctor->>Web: refresh patient timeline
  Web->>RF: GET /api/v1/timeline?patient_id=P
  RF-->>Web: [internal records, ...external records labelled "External: <HIP name>"]
  Doctor->>Web: open external record
  Web->>RF: GET /api/v1/external-records/{id}
  RF->>RF: UPDATE external_health_records.doctor_viewed_at
  RF-->>Web: bundle (decoded for display)
```

Notes:

- **Patient approval can take days.** The 7-day timer in `AWAITING_PATIENT_APPROVAL` is the explicit timeout; without it, abandoned consent requests would orphan workflow rows indefinitely.
- **`abdm.health-record.received` is the boundary event.** Integration Hub's job ends here; Record Foundation's begins. The two services are decoupled by the event bus -- if Record Foundation is briefly unavailable, the event sits in the bus and is consumed when Record Foundation comes back.
- **Display labelling.** The doctor sees an `External: <HIP name>` tag on every externally received record. This is *not* a UX nicety -- it is medico-legal hygiene. The platform never lets external records masquerade as locally authored data. The tag flows from `care_contexts.source_origin = 'external_abdm'` -> `timeline_index.origin_label = "External: <HIP name>"`.
- **`doctor_viewed_at` audit.** First view is recorded for compliance. Phase 4 EMR will surface "unread external record" badges from this column.

---

## Scenario 6 -- Consent expires; bundles erased

The doctor used a one-month consent. A month later, the lifecycle supervisor's timer fires.

```mermaid
sequenceDiagram
  autonumber
  participant Timer as Timer Worker<br/>(SELECT FOR UPDATE SKIP LOCKED)
  participant FSM as FSM Engine
  participant Bus as Event Bus
  participant RF as Record Foundation
  participant Sched as RF Erasure Scheduler<br/>(nightly)
  participant DB as record_foundation tables
  participant EL as record_foundation.erasure_log

  Timer->>FSM: dispatch timer fire on workflow Ws (consent supervisor)
  FSM->>FSM: state ACTIVE -> EXPIRED
  FSM->>Bus: emit abdm.consent.expired<br/>(consent_id, dataEraseAt)
  Bus-->>RF: abdm.consent.expired
  RF->>RF: UPDATE timeline_index SET consent_disclosable=false WHERE consent...
  RF->>RF: ensure external_health_records.data_erase_at <= now() for affected rows

  Note over Sched,EL: Nightly run

  Sched->>DB: SELECT id, original_size, original_hash, bundle_storage_id<br/>FROM external_health_records WHERE data_erase_at <= now()
  loop For each due record
    Sched->>EL: INSERT (kind=external_health_record, ..., reason=consent_expired)
    Sched->>DB: DELETE FROM external_health_records WHERE id = ?
    Sched->>DB: DELETE FROM bundle_storage WHERE id = bundle_storage_id
    Sched->>EL: INSERT (kind=bundle_storage, ..., reason=consent_expired)
    Sched->>Bus: PUBLISH record-foundation.bundle.erased
  end
```

Notes:

- **The supervisor expires the consent declaratively** -- it does not erase. Erasure is Record Foundation's responsibility; the supervisor's signal causes Record Foundation to mark records as erasure-due and the scheduler to follow through.
- **Two-step erasure** (mark-disclosable=false, then schedule-then-erase) gives the doctor time to be informed (the timeline immediately stops showing the records under that consent) before bytes are physically deleted at the next scheduler run.
- **`erasure_log` precedes `DELETE`.** The order matters for crash safety: a half-erasure that leaves an `erasure_log` row plus an unleated source row will be re-encountered on the next run and idempotently completed. The reverse order would lose the audit if the system crashed between DELETE and erasure_log INSERT.
- **DPDP Act section 11.** This scenario is the operational form of compliance.

---

## Scenario 7 -- Operations: a stuck workflow (gateway returned an unexpected error)

ABDM occasionally returns 500-class errors for transient gateway issues. The workflow row's `last_transition_at` ages without progress. Operations should be alerted.

```mermaid
sequenceDiagram
  autonumber
  participant Mon as Monitoring (Grafana)
  participant DB as integration_workflows
  participant Ops as Operator
  participant Hub as Integration Hub Admin API
  participant FSM as FSM Engine

  Mon->>DB: SELECT count(*) FROM integration_workflows<br/>WHERE status='running' AND last_transition_at < now() - interval '30 min'
  DB-->>Mon: count
  Mon->>Mon: if count > threshold: page on-call

  Ops->>Hub: GET /api/v1/admin/workflows?stuck=true
  Hub->>DB: query stuck rows
  DB-->>Hub: list
  Hub-->>Ops: stuck workflows with current_state, error, transition history

  Ops->>Hub: POST /api/v1/admin/workflows/{id}/retry-current<br/>(retry the side-effect of the current state)
  Hub->>FSM: dispatch retry event with trigger_kind='manual'
  FSM->>FSM: re-run side-effects of current transition
  alt Succeeds
    FSM-->>Hub: advanced
  else Still fails
    Hub-->>Ops: error preserved
  end

  alt Genuinely broken
    Ops->>Hub: POST /api/v1/admin/workflows/{id}/cancel<br/>(reason)
    Hub->>FSM: dispatch cancel event
    FSM->>FSM: status -> cancelled
  end
```

Notes:

- **Stuck-workflow detection** is a single SQL query against `last_transition_at`. The index `idx_workflows_status_age` makes it cheap.
- **Manual retry** is a first-class engine operation, not a database update. It runs through the same engine code as automatic retries, generating a new `integration_workflow_transitions` row with `trigger_kind='manual'` and `actor=<user_id>`.
- **Cancellation is a transition.** The engine writes the `cancelled` status, runs any compensating side-effects defined for cancellation in the FSM definition (none for ABDM today, but the hook exists), and emits `integration.workflow.failed`.

---

## References

- See [`02-fsm-specifications.md`](./02-fsm-specifications.md) References for ABDM v3 spec extracts and FSM-pattern citations.
- HL7 International, "FHIR R4 -- Bundle", https://hl7.org/fhir/R4/bundle.html, accessed 2026-05-08.
- National Health Authority, "ABDM Wrapper -- sample HIP and HIU specs", https://github.com/NHA-ABDM/ABDM-wrapper/tree/main/sample-hip and `/sample-hiu`, accessed 2026-05-08 -- protocol shapes for the inbound/outbound endpoints used in scenarios above.
