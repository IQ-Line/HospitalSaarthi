**Depends on:** Story 1 (Instant Consultation Canvas), Story 3 (Offline Local Persistence), Story 4 (Autosave and Crash Recovery), Story 5 (Pending-Sync Queue and Reconnect Sync)

As a Doctor,\
I want clear and predictable behavior when I end a consultation, scan the same patient's parcha again, or move on to the next patient,\
so that I never create duplicate consultations, never lose work in progress, and never link a prescription to the wrong patient.

## Context

Stories 1 to 5 cover opening the canvas, capturing and persisting the consultation, recovering it after a crash, and syncing it. This story closes the workflow loop: how a consultation is ended, what happens when a doctor scans the next patient, how duplicate scans of the same Visit ID behave, and how multiple local drafts are switched between. These behaviors were the ambiguous edge cases in the original story and the feedback flagged them as needing decision tables and an explicit end-of-consultation flow (gaps 11 and 12).

The enqueue trigger that this story owns (end-of-consultation) is consumed by Story 5's pending-sync queue.

## End-of-Consultation Flow

A consultation can be ended in two ways:

i. **Explicit End Consultation action:** the doctor ends the current consultation directly via the End Consultation control.\
ii. **Scanning a different valid Visit ID:** scanning a new, valid (today's) parcha for a different Visit ID auto-closes the current consultation and opens a new consultation for the scanned Visit ID.

**On end, by either trigger:**

a. The consultation is finalized locally and marked Pending Sync (Story 5).\
b. The consultation is placed in the pending-sync queue and drains automatically when connectivity allows.\
c. Ending is allowed regardless of patient-fetch state, the consultation finalizes with whatever was captured (canvas strokes always; patient fields only if fetched).

## Ending Without Patient Data Resolved

i. The doctor may end and finalize a consultation even if patient metadata never loaded (for example, the whole consultation was offline and the fetch never succeeded).\
ii. The consultation **syncs to the cloud with whatever was captured** (canvas strokes, Visit ID, device time at open, and any fields that were fetched). Sync is never withheld for missing patient data.\
iii. However, the downstream **FHIR bundle generation and ABDM workflows shall only trigger once all required patient details are present and resolved** server-side. If required details are missing at sync time, the consultation is stored and the FHIR/ABDM trigger is held.\
iv. Once the server resolves the patient for that Visit ID and all required details are present, FHIR and ABDM then proceed automatically (existing functionality, Story 5).\
v. SMS and WhatsApp notifications, being part of the same downstream pipeline, follow the same dependency: they fire only when their prerequisites (including a successfully generated bundle where applicable) are met.

This refines Story 5: a successful online sync triggers the downstream pipeline only when the patient is fully resolved, an unresolved consultation still syncs but waits for resolution before FHIR/ABDM run.

## Duplicate Scan Decision Table

| Scenario                                                                        | Current state of that Visit ID | System behavior                                                                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Same Visit ID scanned again while its consultation is open and in progress      | In progress (current canvas)   | Continue the existing consultation without interruption. No second canvas, no duplicate record, no prompt.                            |
| Same Visit ID scanned again while it is a local draft but not the active canvas | Local draft, not active        | Reopen and resume the existing consultation into the canvas. No duplicate record is created.                                          |
| Same Visit ID scanned again after it was ended and/or synced                    | Ended / Pending Sync / Synced  | Reopen and resume the existing consultation record into the canvas, continue the same record rather than creating a new one.          |
| A different valid Visit ID scanned while a consultation is open                 | New patient                    | Auto-close (end) the current consultation per the end flow, then open a new consultation for the new Visit ID.                        |
| Same Visit ID active on another device                                          | Active elsewhere               | Each device runs its own independent local session, the server reconciles on sync via last-write-win (Story 5). No client-side block. |

Core rule: a scan of an already-known Visit ID always resolves to the existing record (resume/reopen). A new canvas and new local record are created only for a Visit ID not already present locally.

## Session Switching (Multiple Local Drafts)

i. After a crash, Story 4 restores the most recent un-synced draft into the canvas while preserving other un-synced drafts in the local store and queue.\
This story defines how the doctor reaches those preserved drafts: scanning a preserved draft's Visit ID reopens and resumes it (per the decision table).\
ii. Switching to another consultation by scanning a different Visit ID ends and finalizes the current one (end flow), so only one consultation is active in the canvas at a time.\
iii. Switching shall never merge two consultations or carry strokes from one Visit ID into another (per-Visit-ID isolation, Story 3).

## Functional Requirements

i. The system shall provide an explicit End Consultation action that finalizes the current consultation and marks it Pending Sync.\
ii. The system shall, on a scan of a different valid Visit ID, auto-close the current consultation (end flow) and open a new consultation for the scanned Visit ID.\
iii. The system shall allow ending regardless of patient-fetch state, finalizing with whatever was captured.\
iv. The system shall sync an ended consultation with whatever was captured, never withholding sync due to missing patient data.\
v. The system shall hold the FHIR and ABDM trigger for a synced consultation until all required patient details are present and resolved server-side, then allow them to proceed automatically.\
vi. On a scan of a Visit ID that already exists locally (in progress, draft, ended, Pending Sync, or Synced), the system shall reopen and resume the existing record and shall not create a duplicate consultation or duplicate local record.\
vii. On a scan of a Visit ID not already present locally, the system shall create a new consultation (Story 1).\
viii. The system shall keep only one consultation active in the canvas at a time; opening another shall end the current one.\
ix. The system shall preserve per-Visit-ID isolation across all switching and duplicate-scan behavior, no strokes or fields shall cross between Visit IDs.\
x. The system shall treat the same Visit ID active on another device as an independent local session, relying on server reconciliation (Story 5) rather than a client-side lock.

## State Interaction

i. End-of-consultation transitions a record from Draft Local (Story 3) to Pending Sync (Story 5).\
ii. Reopening a Synced or Pending Sync record into the canvas does not by itself change its sync status, if the doctor adds content and ends again, the most recent write governs the server record via last-write-win (Story 5).\
iii. Auto-close on next-patient scan applies the same end transition to the outgoing consultation before the incoming one is created.

## Non-Functional Requirements

i. **No duplication:** no workflow path (re-scan, switch, auto-close, crash-then-rescan) shall create a duplicate consultation or duplicate local record for a Visit ID.\
ii. **No data loss:** ending, switching, and auto-close shall all finalize via autosave (Story 4) so no completed stroke is lost during the transition.\
iii. **No cross-linking:** no prescription content shall ever attach to a different patient's Visit ID.\
iv. **Non-blocking:** ending and switching shall be responsive and shall not wait on sync or patient fetch to complete.\
v. **Predictability:** identical scan inputs in identical states shall always produce the decision-table outcome (deterministic behavior), so the doctor can rely on it.\
vi. **Security:** reopening a record requires an authorized session to decrypt local PHI (Story 3), switching does not expose another patient's data in the canvas.\
vii. **Observability:** the system shall emit telemetry for end-of-consultation events (by trigger type), duplicate-scan resolutions (resume vs new), auto-close events, and held-FHIR occurrences (consultations synced but awaiting patient resolution), without PHI.

## Acceptance Criteria

**Explicit end finalizes and en-queue**

* Given a consultation is open

* When the doctor uses the End Consultation action

* Then the consultation is finalized and marked Pending Sync

* And it enters the pending-sync queue.

**Next-patient scan auto-closes current**

* Given a consultation is open

* When the doctor scans a different valid Visit ID

* Then the current consultation is finalized and enqueued

* And a new consultation opens for the scanned Visit ID

* And no strokes carry over between the two.

**End allowed without patient data**

* Given patient metadata never loaded for the open consultation

* When the doctor ends it

* Then the consultation finalizes with whatever was captured

* And it syncs to the cloud

* And the FHIR and ABDM trigger is held until all required patient details are resolved server-side.

**FHIR triggers only when resolved**

* Given a consultation was synced without resolved patient details

* When the server later resolves all required patient details for that Visit ID

* Then FHIR and ABDM proceed automatically

* And the consultation itself was already stored at sync time regardless.

**Duplicate scan, in progress, resumes**

* Given a consultation for a Visit ID is open and in progress

* When the same Visit ID is scanned again

* Then the existing consultation continues without interruption

* And no second canvas or duplicate record is created.

**Re-scan after end reopens existing**

* Given a Visit ID's consultation was already ended or synced

* When the same Visit ID is scanned again

* Then the existing record is reopened and resumed in the canvas

* And no new or duplicate record is created.

**Independent sessions per patient**

* Given the doctor ends one consultation offline and scans a different Visit ID

* When the second consultation begins

* Then separate local sessions exist for each Visit ID

* And both sync independently when connectivity returns

* And no cross-linking occurs.

**Same Visit ID on two devices**

* Given the same Visit ID is active on two devices

* When both end and sync

* Then each device ran its own local session

* And the server reconciles via last-write-win

* And no client-side error or block is shown.

**Switching preserves other drafts**

* Given multiple un-synced drafts exist

* When the doctor scans one preserved draft's Visit ID

* Then that draft reopens and resumes in the canvas

* And the other drafts remain preserved and queued.

## Edge Cases

i. **Rapid double-scan of the same Visit ID:** two scans of the same in-progress Visit ID within a moment shall resolve to a single continuing consultation, the second scan is a no-op resume, not a new session.\
ii. **Scan a different but invalid (wrong-day) Visit ID while a consultation is open:** the current consultation is not closed, the invalid scan shows "Please scan Today's Parcha" (Story 1) and the open consultation continues untouched.\
iii. **End with an in-progress (un-lifted) stroke:** the end action shall trigger a final save (Story 4 safety-net triggers) so completed strokes are captured, only a never-completed stroke is excluded.\
iv. **Auto-close while the outgoing consultation's fetch is still pending:** the outgoing consultation finalizes and syncs with what was captured, its FHIR/ABDM remains held until resolution, while the incoming consultation opens normally. v. **Re-scan of a Synced consultation, doctor adds content, ends again:** the record re-enters Pending Sync, the most recent write governs the server copy via last-write-win (Story 5).\
vi. **Doctor ends a consultation that has no strokes at all:** behavior to confirm (finalize an empty consultation, or discard it). See Open Questions.\
vii. **Visit ID not found at scan:** handled by Story 1 (local validation) and Story 2 (background not-found handling), this story does not create a session for a Visit ID that fails validation.
