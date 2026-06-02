**Depends on:** Story 1 (Instant Consultation Canvas on Barcode Scan)\
\
As a Doctor,\
I want the patient's details to load automatically in the background after the canvas has already opened,\
so that the patient information appears on screen as soon as it is available without ever interrupting my writing or making me wait.\
\
**Context**

In Story 1, the canvas opens immediately on a valid Visit ID, with a "loading…" placeholder shown in the patient-info area. This story defines how the system fetches the patient's metadata in the background, populates the UI when it arrives, and behaves when the fetch is slow, partial, or fails, all without blocking the doctor. Because Smart Parcha is offline-first and the system is usually online but on low or fluctuating bandwidth, the background fetch must be fully asynchronous and tolerant of timeouts and retries.\
\
**Patient Fields Fetched**

The background fetch retrieves, for the scanned Visit ID:

i. Patient Name ii. Age iii. Gender iv. UHID v. Visit ID vi. Vitals vii. Medical History viii. Previous Prescriptions\
\
**Functional Requirements**

i. After the canvas opens (Story 1), the system shall trigger an asynchronous background fetch for the patient metadata associated with the scanned Visit ID.\
ii. The fetch shall run off the main writing path, the doctor shall be able to write continuously while it runs.\
iii. When data is received, the UI shall update in place populating Patient name, age, gender, UHID, vitals, medical history, and previous prescriptions with no page refresh and no interruption to writing.\
iv. The header reference shall remain keyed to the Visit ID throughout and populated patient details are additive and shall not replace or move the Visit ID reference.\
v. The system shall support partial population: any field that arrives shall render as soon as it is available and fields not yet available shall continue to show a loading or empty-state indicator rather than blocking the rendered fields.\
vi. The system shall apply a fetch timeout. On timeout, the fetch shall be retried per the retry policy below; the canvas and any already-rendered fields remain unaffected.\
vii. The system shall retry a failed or timed-out fetch automatically with backoff, up to a configured maximum attempt count, and shall also retry opportunistically when connectivity is restored.\
viii. If the fetch ultimately does not complete, the patient-info area shall show a non-blocking state indicating details could not be loaded, the doctor shall still be able to write, complete, and end the consultation. The consultation remains associated with the Visit ID.\
ix. Once any local edits exist, background-fetched patient metadata shall not overwrite doctor-entered clinical content. Patient metadata (name, age, gender, UHID, vitals, history, previous prescriptions) and doctor-authored prescription content are separate data domains and shall be merged by domain, never cross-overwritten.\
x. If patient metadata is fetched more than once for the same session (e.g., a retry returns after a partial information, the latest successfully fetched metadata shall replace the earlier partial metadata for the metadata domain only, leaving prescription content untouched.\
xi. The fetched patient metadata shall be written to the same local store as the consultation (per Story 3) so the session is self-contained for offline continuation and crash recovery.

## Data Source, Merge, and Precedence Rules

i. **Source of truth for patient metadata:** the server is the authoritative source for patient name, age, gender, UHID, vitals, medical history, and previous prescriptions.\
ii. **Source of truth for clinical content:** the doctor's canvas strokes and AI-extracted prescription are authored locally and are authoritative locally until synced.\
iii. **Merge by domain:** patient metadata fields populate the patient-info area, clinical content populates the Vitals and MEdical History. The two never write to each other's fields.\
iv. **Field-level update for metadata:** when a later fetch returns a more complete metadata set, individual metadata fields are updated to the latest server values. Metadata fields are not doctor-editable in this story, so no metadata merge conflict with doctor edits can occur.\
v. **Stale-data handling:** if the device already holds previously cached metadata for the Visit ID, it shall render immediately as a provisional value and be refreshed when the fresh fetch returns.

## State Model- Patient Fetch Lifecycle

The patient fetch for a session moves through these states, surfaced as a visible indicator in the patient-info area:

i. **Patient Fetch Pending** - canvas open, fetch in progress, placeholder " loading…" shown.\
ii. **Patient Fetch Partial** - some fields received and rendered, remaining fields still pending.\
iii. **Patient Fetch Complete** - all requested fields received and rendered.\
iv. **Patient Fetch Failed** - fetch exhausted retries without success, non-blocking failure state with manual retry shown. v. **Patient Fetch Retrying** - a retry is in flight after a prior timeout or failure (may follow Pending, Partial, or Failed).

This lifecycle is the fetch portion of the broader session state model, the sync portion is defined in **Story 5.**

## UI / UX Behavior

i. Before any data arrives, the patient-info area shows "loading…" (from Story 1).\
ii. As fields arrive, they replace their individual placeholders without shifting the canvas focus or the cursor.\
iii. On failure, a non-blocking banner or inline message states that details could not be loaded.\
iv. No loading, partial, failed, or retry state shall disable, blur, or interrupt the writing canvas.\
vi. Placeholder text for unfetched fields shall be neutral (e.g., an em-dash or "—" equivalent rendered as a plain dash) and clearly distinguishable from a real value.

## Non-Functional Requirements

i. **Non-blocking:** the fetch and all retries shall be fully asynchronous, canvas interactivity and writing latency shall be unaffected by fetch state.\
ii. **Timeout:** a per-attempt fetch timeout shall be applied so a hung request does not retry indefinitely against a dead connection.\
iii. **Retry policy:** automatic retries shall use backoff up to a configured maximum, plus an opportunistic retry on connectivity restoration.\
iv. **Low-bandwidth tolerance:** on slow connections, partial rendering shall begin as soon as the first usable field is available rather than waiting for the full payload.\
v. **Security and PHI:** fetched patient metadata is PHI, it shall be stored locally only within the consultation's local store (per Story 3) and shall follow the local-PHI protection rules defined there (encryption at rest, retention, cleanup).\
vi. **Idempotency:** repeated fetches for the same Visit ID shall be safe and shall not create duplicate sessions or duplicate local records.

## Acceptance Criteria

**Background population without interruption**

* Given the consultation canvas is already open and the doctor is writing

* When patient details become available

* Then the system populates patient name, age, gender, UHID, vitals, medical history, and previous prescriptions

* And does so without refreshing the page and without interrupting the doctor's writing activity.

**Writing continues during fetch**

* Given the patient fetch is still pending or retrying

* When the doctor writes on the canvas

* Then writing is captured normally in the Canvas

* And the pending or retrying fetch has no effect on canvas responsiveness.

**Partial fetch rendering**

* Given only some patient fields have been returned

* When the partial response is processed

* Then the returned fields render immediately and shall be shown in the respective placeholder

* And the not-yet-returned fields continue to show a loading or neutral placeholder

* And the canvas remains fully usable.

**Fetch timeout and retry**

* Given a patient fetch does not return within the configured timeout

* When the timeout elapses

* Then the system retries with backoff up to the configured maximum

* And neither the canvas nor any already-rendered field is disturbed.

**Fetch failure is non-blocking**

* Given the patient fetch has exhausted its retries without success

* When the failure state is reached

* Then the patient-info area shows a non-blocking "dash" state

* And the doctor can still write, complete, and end the consultation.

* And the consultation remains associated with the scanned Visit ID.

**Opportunistic retry on reconnect**

* Given a patient fetch previously failed while offline

* When connectivity is restored

* Then the system automatically attempts the fetch again

* And populates the patient-info area on success without interrupting the consultation.

**No cross-domain overwrite**

* Given the doctor has already written clinical content on the canvas

* When background patient metadata arrives

* Then the metadata populates only the patient-info area

* And no doctor-authored clinical content is altered, replaced, or lost.

**Latest metadata wins for metadata domain**

* Given a partial metadata set was rendered and a later retry returns a fuller set

* When the later set is processed

* Then metadata fields update to the latest server values

* And prescription content remains untouched.

## Edge Cases

i. **Visit ID not found on server:** the background fetch resolves to "Patient not found" for a Visit ID that passed local date validation. The system shall keep the canvas open (the doctor may have a legitimate today's parcha not yet propagated to this node) and show a non-blocking note that patient details are unavailable, resolution of mismatched/unknown Visit IDs is finalized during sync (Story 5).\
ii. **Fetch returns after consultation ended:** if metadata arrives after the doctor has ended the consultation, it shall be stored against the session record but shall not reopen or alter the closed canvas.\
iii. **Connectivity flaps mid-fetch:** repeated connect/disconnect during a fetch shall not produce duplicate sessions or duplicate populated fields. The fetch is retried, not re-initiated as a new session.\
iv. **Empty but successful response:** a successful response containing no usable fields shall be treated as a failed population for UI purposes (show the non-blocking unavailable state) while not erroring the consultation.\
v.**Previous Prescriptions large payload:** if previous prescriptions are large, they shall load progressively or lazily so they do not delay rendering of the core identity fields (name, age, gender, UHID).
